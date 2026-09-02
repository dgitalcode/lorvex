"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Database, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import {
  createBackupRecord,
  deleteStoredBackup,
  restoreStoredBackup,
  validateStoredBackup,
} from "@/server/actions/admin/system";
import { StatCard } from "@/components/admin/stat-card";
import { RESTORE_CONFIRMATION_PHRASE } from "@/server/backup/types";

export type BackupRow = {
  id: string;
  filename: string;
  status: string;
  type: string;
  sizeBytes: number | null;
  storageProvider: string | null;
  checksum: string | null;
  checksumAlgorithm: string | null;
  encrypted: boolean;
  retentionClass: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

const STEPS = [
  "Preparing backup...",
  "Creating database snapshot...",
  "Encrypting...",
  "Uploading...",
  "Verifying...",
  "Completed.",
] as const;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isLegacy(row: BackupRow) {
  return row.type === "LEGACY" || row.status === "LEGACY" || !row.checksum;
}

export function BackupsManager({
  backups,
  canManage,
  health,
  storageConfigured,
  missingConfig,
}: {
  backups: BackupRow[];
  canManage: boolean;
  health: {
    ready: number;
    failed: number;
    legacy: number;
    lastSuccessfulAt: string | null;
    nextScheduledAt: string | null;
    operationLock: string;
  };
  storageConfigured: boolean;
  missingConfig: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(-1);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");

  const verifyTarget = backups.find((row) => row.id === verifyId);

  function runCreate() {
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current >= 0 && current < 4 ? current + 1 : current));
    }, 900);
    startTransition(async () => {
      const result = await createBackupRecord();
      window.clearInterval(timer);
      if (!result.ok) {
        setStepIndex(-1);
        toast.error(result.error ?? "Backup failed.");
        return;
      }
      setStepIndex(5);
      toast.success("Encrypted backup stored externally.");
      window.setTimeout(() => {
        setStepIndex(-1);
        window.location.reload();
      }, 600);
    });
  }

  function runDownload(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/backups/${id}/download`, {
          method: "POST",
        });
        if (!response.ok) {
          toast.error("Download failed.");
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const disposition = response.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="([^"]+)"/);
        anchor.href = url;
        anchor.download = match?.[1] ?? `lorvex-backup-${id}.lvxb`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Download failed.");
      }
    });
  }

  function runDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteStoredBackup(deleteId);
      if (!result.ok) {
        toast.error(result.error ?? "Delete failed.");
        return;
      }
      toast.success("Backup deleted.");
      setDeleteId(null);
      window.location.reload();
    });
  }

  function runVerify() {
    if (!verifyId) return;
    startTransition(async () => {
      const result = await validateStoredBackup(verifyId);
      if (!result.ok) {
        toast.error(result.error ?? "Verification failed.");
        return;
      }
      toast.success("Backup checksum and dump format verified.");
      setVerifyId(null);
      setPhrase("");
    });
  }

  function runRestoreBlocked() {
    if (!verifyId) return;
    startTransition(async () => {
      const result = await restoreStoredBackup(verifyId, phrase);
      toast.error(result.ok ? "Unexpected restore result." : (result.error ?? "Restore blocked."));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Disaster recovery
          </p>
          <h2 className="font-display text-3xl tracking-tight">Backups</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Encrypted logical snapshots of catalog, orders, customers, inventory,
            CMS, and marketing data are stored in private object storage.
            Cloudinary media binaries and environment secrets are not included.
            Automated production restore is disabled.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" disabled={pending || !storageConfigured} onClick={runCreate}>
            {pending && stepIndex >= 0 ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Create backup
          </Button>
        ) : null}
      </div>

      {!storageConfigured ? (
        <p className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          External backup storage is not configured.
          {missingConfig.length ? ` Missing: ${missingConfig.join(", ")}.` : null}
        </p>
      ) : null}

      {stepIndex >= 0 ? (
        <p className="border border-border bg-muted/40 px-4 py-3 text-sm">
          {STEPS[stepIndex]}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Valid backups" value={String(health.ready)} hint="Encrypted + checksummed" />
        <StatCard label="Failed" value={String(health.failed)} />
        <StatCard
          label="Last successful"
          value={health.lastSuccessfulAt ? formatDateTime(health.lastSuccessfulAt) : "Never"}
        />
        <StatCard
          label="Next scheduled"
          value={health.nextScheduledAt ? formatDateTime(health.nextScheduledAt) : "03:00 UTC"}
          hint="Vercel Cron"
        />
        <StatCard
          label="Lock"
          value={health.operationLock}
          hint={`${health.legacy} legacy metadata-only`}
        />
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Backup catalog</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-3">Filename</th>
                <th className="pb-3">Created</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Checksum</th>
                <th className="pb-3">Retention</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No backups yet.
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id}>
                    <td className="py-3 font-medium">{backup.filename}</td>
                    <td className="py-3 text-muted-foreground">
                      {formatDateTime(backup.createdAt)}
                    </td>
                    <td className="py-3 tabular-nums">{formatSize(backup.sizeBytes)}</td>
                    <td className="py-3">
                      <Badge variant="outline">{backup.status}</Badge>
                    </td>
                    <td className="py-3">{backup.storageProvider ?? "—"}</td>
                    <td className="py-3">{isLegacy(backup) ? "LEGACY / METADATA_ONLY" : backup.type}</td>
                    <td className="py-3 font-mono text-xs">
                      {backup.checksum
                        ? `${backup.checksumAlgorithm ?? "sha256"} ${backup.checksum.slice(0, 10)}…`
                        : "—"}
                    </td>
                    <td className="py-3">{backup.retentionClass ?? "—"}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending || isLegacy(backup) || !canManage}
                          onClick={() => runDownload(backup.id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending || isLegacy(backup) || !canManage}
                          onClick={() => {
                            setPhrase("");
                            setVerifyId(backup.id);
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending || !canManage}
                          onClick={() => setDeleteId(backup.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete backup</DialogTitle>
            <DialogDescription>
              This removes the encrypted object from external storage and its catalog row.
              The only restorable backup cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={runDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(verifyId)} onOpenChange={(open) => !open && setVerifyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify backup</DialogTitle>
            <DialogDescription>
              Automated restore against production PostgreSQL is disabled.
              Verification checks the checksum, encryption envelope, and dump
              format. Recovery uses a Neon point-in-time or branch restore on a
              non-production database, then a reviewed cutover.
            </DialogDescription>
          </DialogHeader>
          {verifyTarget ? (
            <div className="space-y-1 text-sm">
              <p>{verifyTarget.filename}</p>
              <p className="text-muted-foreground">
                {verifyTarget.type} · {formatSize(verifyTarget.sizeBytes)} ·{" "}
                {formatDateTime(verifyTarget.createdAt)}
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="restore-phrase">Restore phrase (not executed)</Label>
            <Input
              id="restore-phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={RESTORE_CONFIRMATION_PHRASE}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setVerifyId(null)}>
              Close
            </Button>
            <Button type="button" disabled={pending} onClick={runVerify}>
              Verify integrity
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || phrase !== RESTORE_CONFIRMATION_PHRASE}
              onClick={runRestoreBlocked}
            >
              Request restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
