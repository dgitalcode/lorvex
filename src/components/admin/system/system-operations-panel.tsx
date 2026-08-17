"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Activity, Database, HardDrive, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import {
  clearCacheTags,
  createBackupRecord,
  runHealthChecks,
} from "@/server/actions/admin/system";

type HealthRow = {
  id: string;
  service: string;
  status: string;
  latencyMs: number | null;
  detail: string | null;
  checkedAt: string;
};

type JobRow = {
  id: string;
  key: string;
  name: string;
  cron: string | null;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
};

type BackupRow = {
  id: string;
  filename: string;
  status: string;
  sizeBytes: number | null;
  createdAt: string;
};

export function SystemOperationsPanel({
  latestChecks,
  jobs,
  backups,
  cloudinaryUsage,
  emailStatus,
  cloudinaryStatus,
  canManage,
}: {
  latestChecks: HealthRow[];
  jobs: JobRow[];
  backups: BackupRow[];
  cloudinaryUsage: {
    credits?: { usage?: number; limit?: number };
    storage?: { usage?: number; limit?: number };
    bandwidth?: { usage?: number; limit?: number };
  } | null;
  emailStatus: { configured: boolean; from: string; missing: string[] };
  cloudinaryStatus: {
    configured: boolean;
    cloudName: string | null;
    missing: string[];
    error?: string | null;
  };
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runAction(
    label: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? `${label} failed.`);
        return;
      }
      toast.success(`${label} completed.`);
      router.refresh();
    });
  }

  const storageUsed = cloudinaryUsage?.storage?.usage;
  const storageLimit = cloudinaryUsage?.storage?.limit;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="System"
        title="System health"
        description="Monitor integrations, run diagnostics, backups and cache operations."
        actions={
          canManage ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runAction("Health checks", runHealthChecks)}
              >
                <Activity className="mr-2 h-4 w-4" />
                Run health checks
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runAction("Backup", createBackupRecord)}
              >
                <Database className="mr-2 h-4 w-4" />
                Create backup
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => runAction("Cache clear", clearCacheTags)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear cache
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cloudinary"
          value={cloudinaryStatus.configured ? "Configured" : "Broken"}
          icon={HardDrive}
          hint={
            cloudinaryStatus.configured
              ? (cloudinaryStatus.cloudName ?? "Connected")
              : cloudinaryStatus.error ||
                cloudinaryStatus.missing.join(", ") ||
                "Not connected"
          }
        />
        <StatCard
          label="Email"
          value={emailStatus.configured ? "Configured" : "Missing"}
          hint={emailStatus.from}
        />
        <StatCard
          label="Storage used"
          value={
            storageUsed != null
              ? `${Math.round(storageUsed / (1024 * 1024))} MB`
              : "—"
          }
          hint={
            storageLimit != null
              ? `Limit ${Math.round(storageLimit / (1024 * 1024))} MB`
              : undefined
          }
        />
        <StatCard
          label="Latest checks"
          value={String(latestChecks.length)}
          hint={`${backups.filter((b) => b.status === "COMPLETED").length} backups`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Health checks</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {latestChecks.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No checks recorded yet.</p>
            ) : (
              latestChecks.map((check) => (
                <div key={check.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{check.service}</p>
                    <p className="text-xs text-muted-foreground">{check.detail ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{check.status}</Badge>
                    {check.latencyMs != null && (
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {check.latencyMs} ms
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Scheduled jobs</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {jobs.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No scheduled jobs defined.</p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{job.name}</p>
                    <Badge variant="outline">{job.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{job.key}</p>
                  {job.lastError && (
                    <p className="mt-1 text-xs text-destructive">{job.lastError}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Recent backups</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-3">Filename</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Size</th>
                <th className="pb-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No backups yet.
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id}>
                    <td className="py-3 font-medium">{backup.filename}</td>
                    <td className="py-3">
                      <Badge variant="outline">{backup.status}</Badge>
                    </td>
                    <td className="py-3 tabular-nums">
                      {backup.sizeBytes
                        ? `${Math.round(backup.sizeBytes / 1024)} KB`
                        : "—"}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {formatDateTime(backup.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
