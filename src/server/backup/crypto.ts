import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  BACKUP_MAGIC,
  CHECKSUM_ALGORITHM,
  ENCRYPTION_ALGORITHM,
} from "@/server/backup/types";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function getBackupEncryptionKey(raw = process.env.BACKUP_ENCRYPTION_KEY) {
  const value = raw?.trim();
  if (!value) {
    throw new Error("BACKUP_ENCRYPTION_KEY is not configured.");
  }
  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, "hex");
  }
  const fromB64 = Buffer.from(value, "base64");
  if (fromB64.length === KEY_LENGTH) return fromB64;
  return scryptSync(value, "lorvex-backup-v1", KEY_LENGTH);
}

export function sha256Hex(buffer: Buffer) {
  return createHash(CHECKSUM_ALGORITHM).update(buffer).digest("hex");
}

export function checksumMatches(actualHex: string, expectedHex: string) {
  const a = Buffer.from(actualHex, "hex");
  const b = Buffer.from(expectedHex, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function encryptBackupPayload(plaintext: Buffer, key = getBackupEncryptionKey()) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(BACKUP_MAGIC, "utf8"), iv, tag, ciphertext]);
}

export function inspectEncryptedBackup(file: Buffer) {
  const magic = Buffer.from(BACKUP_MAGIC, "utf8");
  if (file.length < magic.length + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Backup file is truncated or corrupted.");
  }
  const magicBytes = file.subarray(0, magic.length);
  if (!magicBytes.equals(magic)) {
    throw new Error("Backup file is not a LORVEX encrypted archive.");
  }
  return {
    magic: magicBytes.toString("utf8"),
    iv: file.subarray(magic.length, magic.length + IV_LENGTH),
    authTag: file.subarray(
      magic.length + IV_LENGTH,
      magic.length + IV_LENGTH + AUTH_TAG_LENGTH,
    ),
    ciphertext: file.subarray(magic.length + IV_LENGTH + AUTH_TAG_LENGTH),
    algorithm: ENCRYPTION_ALGORITHM,
  };
}

export function decryptBackupPayload(file: Buffer, key = getBackupEncryptionKey()) {
  const magic = Buffer.from(BACKUP_MAGIC, "utf8");
  if (file.length < magic.length + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Backup file is truncated or corrupted.");
  }
  if (!file.subarray(0, magic.length).equals(magic)) {
    throw new Error("Backup file is not a LORVEX encrypted archive.");
  }
  const iv = file.subarray(magic.length, magic.length + IV_LENGTH);
  const tag = file.subarray(
    magic.length + IV_LENGTH,
    magic.length + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = file.subarray(magic.length + IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function gzipJson(value: unknown) {
  return gzipSync(Buffer.from(JSON.stringify(value), "utf8"), { level: 9 });
}

export function gunzipJson<T>(buffer: Buffer): T {
  return JSON.parse(gunzipSync(buffer).toString("utf8")) as T;
}
