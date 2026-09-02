export const BACKUP_MAGIC = "LVXB001\n";
export const RESTORE_CONFIRMATION_PHRASE = "RESTORE LORVEX";
export const CHECKSUM_ALGORITHM = "sha256";
export const ENCRYPTION_ALGORITHM = "aes-256-gcm";

export const BACKUP_STATUS = {
  READY: "READY",
  RUNNING: "RUNNING",
  FAILED: "FAILED",
  LEGACY: "LEGACY",
  RESTORING: "RESTORING",
} as const;

export type BackupStatus = (typeof BACKUP_STATUS)[keyof typeof BACKUP_STATUS];

export const BACKUP_TYPE = {
  LOGICAL: "LOGICAL",
  PG_DUMP: "PG_DUMP",
  LEGACY: "LEGACY",
  SAFETY: "SAFETY",
} as const;

export type BackupType = (typeof BACKUP_TYPE)[keyof typeof BACKUP_TYPE];

export const RETENTION_CLASS = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  manual: "manual",
  safety: "safety",
} as const;

export type RetentionClass = (typeof RETENTION_CLASS)[keyof typeof RETENTION_CLASS];

export const DEFAULT_RETENTION = {
  daily: 7,
  weekly: 4,
  monthly: 12,
  safety: 3,
} as const;

/** High-churn or self-referential catalog tables omitted from application dumps. */
export const BACKUP_SKIP_MODELS = [
  "RateLimitHit",
  "AnalyticsEvent",
  "BackupRecord",
  "ScheduledJob",
] as const;

export type LogicalDumpV1 = {
  format: "lorvex-logical-v1";
  generatedAt: string;
  schemaVersion: string | null;
  tables: Record<string, unknown[]>;
  tableOrder: string[];
  rowCounts: Record<string, number>;
  skippedModels: string[];
  notes: {
    mediaBinaries: "Cloudinary objects are not included; only MediaAsset metadata/URLs.";
    schema: "Logical Prisma dump. Restore rebuilds rows; indexes/constraints come from the live Prisma schema.";
    secrets: "Env secrets and API keys are not included. passwordHash values are one-way hashes.";
  };
};

export type BackupPipelineStep =
  | "preparing"
  | "snapshot"
  | "encrypting"
  | "uploading"
  | "verifying"
  | "completed";
