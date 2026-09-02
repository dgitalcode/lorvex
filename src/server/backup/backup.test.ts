import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checksumMatches,
  decryptBackupPayload,
  encryptBackupPayload,
  gzipJson,
  gunzipJson,
  inspectEncryptedBackup,
  sha256Hex,
} from "./crypto";
import { backupModelNames, topologicalTableOrder } from "./db";
import { createBackupStorage, assertSafeStorageKey } from "./storage";
import { deserializeValue, assertSafeLogicalDump, dumpModelNames, isLogicalDump } from "./logical-dump";
import {
  getBackupConfigStatus,
  isBackupStorageConfigured,
  isMemoryBackupAllowed,
  authorizeBackupCron,
  isAutomatedLogicalRestoreEnabled,
} from "./config";
import {
  assertRestoreConfirmation,
  isLegacyBackup,
  isRestorableBackup,
  selectRetentionDeletions,
  snapshotIsSafe,
} from "./service";
import { RESTORE_CONFIRMATION_PHRASE } from "./types";

describe("backup encryption", () => {
  const key = Buffer.alloc(32, 7);

  it("exposes LVXB001 magic, IV, tag, and ciphertext", () => {
    const file = encryptBackupPayload(Buffer.from("payload"), key);
    const parts = inspectEncryptedBackup(file);
    assert.equal(parts.magic, "LVXB001\n");
    assert.equal(parts.iv.length, 12);
    assert.equal(parts.authTag.length, 16);
    assert.ok(parts.ciphertext.length > 0);
  });

  it("round-trips gzip JSON through AES-256-GCM", () => {
    const payload = { hello: "lorvex", n: 42 };
    const compressed = gzipJson(payload);
    const file = encryptBackupPayload(compressed, key);
    const plain = decryptBackupPayload(file, key);
    assert.deepEqual(gunzipJson(plain), payload);
  });

  it("detects truncated files", () => {
    assert.throws(() => decryptBackupPayload(Buffer.from("nope"), key));
  });
});

describe("backup checksum", () => {
  it("matches identical buffers", () => {
    const body = Buffer.from("abc");
    const digest = sha256Hex(body);
    assert.equal(checksumMatches(digest, digest), true);
    assert.equal(checksumMatches(digest, sha256Hex(Buffer.from("abd"))), false);
  });

  it("rejects corrupted encrypted archives", () => {
    const key = Buffer.alloc(32, 3);
    const file = encryptBackupPayload(Buffer.from("payload"), key);
    file[file.length - 1] ^= 0xff;
    assert.throws(() => decryptBackupPayload(file, key));
  });
});

describe("backup storage keys", () => {
  it("rejects path traversal", () => {
    assert.throws(() => assertSafeStorageKey("../etc/passwd"));
    assert.throws(() => assertSafeStorageKey("/tmp/x"));
    assert.throws(() => assertSafeStorageKey("lorvex/backups/../x"));
    assert.doesNotThrow(() =>
      assertSafeStorageKey("lorvex/backups/lorvex-backup-1.lvxb"),
    );
  });
});

describe("restore authorization helpers", () => {
  it("requires the exact confirmation phrase", () => {
    assert.throws(() => assertRestoreConfirmation("restore"));
    assert.throws(() => assertRestoreConfirmation("DELETE LORVEX"));
    assert.doesNotThrow(() =>
      assertRestoreConfirmation(`  ${RESTORE_CONFIRMATION_PHRASE}  `),
    );
  });

  it("marks metadata-only rows as legacy and not restorable", () => {
    const legacy = {
      type: "LEGACY",
      status: "LEGACY",
      storageKey: null,
      encrypted: false,
      checksum: null,
    };
    assert.equal(isLegacyBackup(legacy), true);
    assert.equal(isRestorableBackup(legacy), false);
  });

  it("allows encrypted stored logical backups", () => {
    assert.equal(
      isRestorableBackup({
        type: "LOGICAL",
        status: "READY",
        storageKey: "lorvex/backups/a.lvxb",
        encrypted: true,
        checksum: "abc",
      }),
      true,
    );
  });
});

describe("backup config", () => {
  it("reports missing production variables", () => {
    const previous = { ...process.env };
    delete process.env.BACKUP_STORAGE_PROVIDER;
    delete process.env.BACKUP_STORAGE_BUCKET;
    delete process.env.BACKUP_STORAGE_ACCESS_KEY;
    delete process.env.BACKUP_STORAGE_SECRET_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    try {
      assert.equal(isBackupStorageConfigured(), false);
      const status = getBackupConfigStatus();
      assert.ok(status.missing.includes("BACKUP_ENCRYPTION_KEY"));
      assert.ok(status.missing.includes("BACKUP_STORAGE_PROVIDER"));
    } finally {
      process.env = previous;
    }
  });

  it("rejects in-memory storage in production", () => {
    const env = process.env as { NODE_ENV?: string };
    const previousNodeEnv = env.NODE_ENV;
    const previousProvider = process.env.BACKUP_STORAGE_PROVIDER;
    const previousKey = process.env.BACKUP_ENCRYPTION_KEY;
    env.NODE_ENV = "production";
    process.env.BACKUP_STORAGE_PROVIDER = "memory";
    process.env.BACKUP_ENCRYPTION_KEY = "a".repeat(64);
    try {
      assert.equal(isMemoryBackupAllowed(), false);
      assert.equal(isBackupStorageConfigured(), false);
      assert.throws(() => createBackupStorage());
    } finally {
      env.NODE_ENV = previousNodeEnv;
      process.env.BACKUP_STORAGE_PROVIDER = previousProvider;
      process.env.BACKUP_ENCRYPTION_KEY = previousKey;
    }
  });
});

describe("restore table order", () => {
  it("places foreign-key parents before dependents", () => {
    const ordered = topologicalTableOrder(backupModelNames());
    assert.ok(ordered.indexOf("User") < ordered.indexOf("Order"));
    assert.ok(ordered.indexOf("Order") < ordered.indexOf("OrderItem"));
  });
});

describe("logical dump serialization", () => {
  it("round-trips dates", () => {
    const date = new Date("2026-08-18T12:00:00.000Z");
    const encoded = { __t: "Date", v: date.toISOString() };
    assert.equal((deserializeValue(encoded) as Date).toISOString(), date.toISOString());
  });
});

describe("backup security and retention", () => {
  it("does not dump high-churn operational tables", () => {
    const names = dumpModelNames();
    assert.equal(names.includes("RateLimitHit"), false);
    assert.equal(names.includes("AnalyticsEvent"), false);
    assert.equal(names.includes("BackupRecord"), false);
    assert.ok(names.includes("Order"));
    assert.ok(names.includes("Product"));
  });

  it("rejects unknown or disallowed dump tables", () => {
    assert.throws(() =>
      assertSafeLogicalDump({
        format: "lorvex-logical-v1",
        generatedAt: "",
        schemaVersion: null,
        tables: { NotAModel: [] },
        tableOrder: ["NotAModel"],
        rowCounts: {},
        skippedModels: [],
        notes: {
          mediaBinaries:
            "Cloudinary objects are not included; only MediaAsset metadata/URLs.",
          schema:
            "Logical Prisma dump. Restore rebuilds rows; indexes/constraints come from the live Prisma schema.",
          secrets:
            "Env secrets and API keys are not included. passwordHash values are one-way hashes.",
        },
      }),
    );
  });

  it("does not treat malformed payloads as dumps", () => {
    assert.equal(isLogicalDump({ format: "zip" }), false);
    assert.equal(isLogicalDump({ format: "lorvex-logical-v1", tables: {} }), false);
  });

  it("keeps backup metadata free of secrets", () => {
    assert.equal(
      snapshotIsSafe({
        format: "lorvex-logical-v1",
        tableCount: 2,
        rowCounts: { Order: 1 },
      }),
      true,
    );
    assert.equal(
      snapshotIsSafe({ DATABASE_URL: "postgresql://example" }),
      false,
    );
  });

  it("retention never deletes the last restorable backup", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(selectRetentionDeletions(rows, 1, 3), [{ id: "b" }, { id: "c" }]);
    assert.deepEqual(selectRetentionDeletions(rows, 1, 1), []);
    assert.deepEqual(selectRetentionDeletions(rows, 7, 3), []);
  });

  it("blocks anonymous cron calls", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-test-secret";
    try {
      const anon = new Request("https://www.lorvex.ma/api/cron/backup");
      assert.equal(authorizeBackupCron(anon), false);
      const ok = new Request("https://www.lorvex.ma/api/cron/backup", {
        headers: { authorization: "Bearer cron-test-secret" },
      });
      assert.equal(authorizeBackupCron(ok), true);
    } finally {
      process.env.CRON_SECRET = previous;
    }
  });

  it("disables automated restore in production-like environments", () => {
    const env = process.env as { NODE_ENV?: string; VERCEL_ENV?: string };
    const previousNode = env.NODE_ENV;
    const previousVercel = env.VERCEL_ENV;
    const previousAllow = process.env.ALLOW_LOGICAL_RESTORE;
    env.VERCEL_ENV = "production";
    process.env.ALLOW_LOGICAL_RESTORE = "true";
    try {
      assert.equal(isAutomatedLogicalRestoreEnabled(), false);
    } finally {
      env.NODE_ENV = previousNode;
      env.VERCEL_ENV = previousVercel;
      process.env.ALLOW_LOGICAL_RESTORE = previousAllow;
    }
  });

  it("keeps downloads on POST and cron on a protected GET", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const download = readFileSync(
      join(import.meta.dirname, "../../app/api/admin/backups/[id]/download/route.ts"),
      "utf8",
    );
    const cron = readFileSync(
      join(import.meta.dirname, "../../app/api/cron/backup/route.ts"),
      "utf8",
    );
    assert.equal(download.includes("methodNotAllowedGet"), true);
    assert.equal(download.includes("getVerifiedBackupFile"), true);
    assert.equal(cron.includes("authorizeBackupCron"), true);
    assert.equal(cron.includes("runBackupPipeline"), true);
  });
});
