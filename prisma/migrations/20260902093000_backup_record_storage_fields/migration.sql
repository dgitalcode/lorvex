-- Additive BackupRecord fields for encrypted object-storage backups.
-- No DROP, no data rewrite.

ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "storageProvider" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "checksumAlgorithm" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "encrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "retentionClass" TEXT;

CREATE INDEX IF NOT EXISTS "BackupRecord_type_status_idx" ON "BackupRecord"("type", "status");
CREATE INDEX IF NOT EXISTS "BackupRecord_storageKey_idx" ON "BackupRecord"("storageKey");
