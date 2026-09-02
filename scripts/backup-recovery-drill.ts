/**
 * Offline recovery drill helpers. Never targets production Neon.
 *
 * Manual production recovery:
 * 1. Neon PITR or branch restore of orange-mountain-34866681 (eu-central-1 / neondb).
 * 2. Do not TRUNCATE production from the application.
 * 3. SUPER_ADMIN downloads an encrypted .lvxb from Admin → System if a logical copy is needed.
 */
import assert from "node:assert/strict";
import {
  decryptBackupPayload,
  encryptBackupPayload,
  gzipJson,
  gunzipJson,
  sha256Hex,
  checksumMatches,
} from "../src/server/backup/crypto";
import {
  authorizeBackupCron,
  isAutomatedLogicalRestoreEnabled,
} from "../src/server/backup/config";

function isDump(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const dump = value as { format?: string; tables?: unknown; tableOrder?: unknown };
  return (
    dump.format === "lorvex-logical-v1" &&
    dump.tables != null &&
    typeof dump.tables === "object" &&
    Array.isArray(dump.tableOrder)
  );
}

const productionHint = process.env.DATABASE_URL ?? "";
if (/orange-mountain|eu-central-1\.aws\.neon\.tech/i.test(productionHint)) {
  console.error("Refusing to run a recovery drill against production Neon.");
  process.exit(1);
}

const key = Buffer.alloc(32, 9);
const dump = {
  format: "lorvex-logical-v1",
  generatedAt: new Date().toISOString(),
  tables: { Brand: [] },
  tableOrder: ["Brand"],
};

const file = encryptBackupPayload(gzipJson(dump), key);
const roundTrip = gunzipJson<typeof dump>(decryptBackupPayload(file, key));
assert.equal(isDump(roundTrip), true);
assert.equal(checksumMatches(sha256Hex(file), sha256Hex(file)), true);
assert.equal(isAutomatedLogicalRestoreEnabled(), false);

const cron = new Request("https://www.lorvex.ma/api/cron/backup");
assert.equal(authorizeBackupCron(cron), false);

console.log("backup-recovery-drill: encryption and restore-guard OK");
