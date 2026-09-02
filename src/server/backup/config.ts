import { createHash, timingSafeEqual } from "node:crypto";

export type BackupStorageProviderName = "s3" | "memory" | "unconfigured";

export type StoredBackupObject = {
  key: string;
  sizeBytes: number;
  checksum: string;
};

export interface BackupObjectStorage {
  readonly provider: BackupStorageProviderName;
  put(key: string, body: Buffer, contentType: string): Promise<StoredBackupObject>;
  get(key: string): Promise<Buffer>;
  head(key: string): Promise<{ sizeBytes: number } | null>;
  remove(key: string): Promise<void>;
  signedDownloadUrl(key: string, filename: string, expiresSeconds: number): Promise<string>;
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function isVercelProduction() {
  return process.env.VERCEL_ENV === "production";
}

/** Automated TRUNCATE restore is never enabled on Vercel (production or preview). */
export function isAutomatedLogicalRestoreEnabled() {
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return false;
  }
  if (isProductionRuntime()) return false;
  return process.env.ALLOW_LOGICAL_RESTORE === "true";
}

export function authorizeBackupCron(request: Request) {
  const expected =
    process.env.CRON_SECRET?.trim() || process.env.BACKUP_CRON_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isMemoryBackupAllowed() {
  return !isProductionRuntime();
}

export function getBackupStorageConfig() {
  const requested = (process.env.BACKUP_STORAGE_PROVIDER ?? "").trim().toLowerCase();
  const provider =
    requested === "memory" && !isMemoryBackupAllowed() ? "unconfigured" : requested || "unconfigured";
  return {
    provider,
    requestedProvider: requested || "unconfigured",
    bucket: process.env.BACKUP_STORAGE_BUCKET?.trim() || "",
    region: process.env.BACKUP_STORAGE_REGION?.trim() || "auto",
    endpoint: process.env.BACKUP_STORAGE_ENDPOINT?.trim() || "",
    accessKey: process.env.BACKUP_STORAGE_ACCESS_KEY?.trim() || "",
    secretKey: process.env.BACKUP_STORAGE_SECRET_KEY?.trim() || "",
    forcePathStyle: process.env.BACKUP_STORAGE_FORCE_PATH_STYLE === "true",
    encryptionConfigured: Boolean(process.env.BACKUP_ENCRYPTION_KEY?.trim()),
    cronSecretConfigured: Boolean(
      process.env.CRON_SECRET?.trim() || process.env.BACKUP_CRON_SECRET?.trim(),
    ),
  };
}

export function isBackupStorageConfigured() {
  const cfg = getBackupStorageConfig();
  if (!cfg.encryptionConfigured) return false;
  if (cfg.provider === "memory") return isMemoryBackupAllowed();
  if (cfg.provider !== "s3") return false;
  return Boolean(cfg.bucket && cfg.accessKey && cfg.secretKey);
}

export function getBackupConfigStatus() {
  const cfg = getBackupStorageConfig();
  const missing: string[] = [];
  if (!cfg.encryptionConfigured) missing.push("BACKUP_ENCRYPTION_KEY");
  if (cfg.requestedProvider === "memory" && !isMemoryBackupAllowed()) {
    missing.push("BACKUP_STORAGE_PROVIDER");
  }
  if (cfg.provider === "memory" && isMemoryBackupAllowed()) {
    return { configured: missing.length === 0, provider: cfg.provider, bucket: "memory", missing };
  }
  if (cfg.provider !== "s3") missing.push("BACKUP_STORAGE_PROVIDER");
  if (!cfg.bucket) missing.push("BACKUP_STORAGE_BUCKET");
  if (!cfg.accessKey) missing.push("BACKUP_STORAGE_ACCESS_KEY");
  if (!cfg.secretKey) missing.push("BACKUP_STORAGE_SECRET_KEY");
  return {
    configured: isBackupStorageConfigured(),
    provider: cfg.provider,
    bucket: cfg.bucket || null,
    missing,
  };
}
