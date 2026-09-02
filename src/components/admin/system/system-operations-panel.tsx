"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Activity, HardDrive, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearCacheTags,
  runHealthChecks,
} from "@/server/actions/admin/system";
import { BackupsManager, type BackupRow } from "@/components/admin/system/backups-manager";

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

export function SystemOperationsPanel({
  latestChecks,
  jobs,
  backups,
  cloudinaryUsage,
  emailStatus,
  cloudinaryStatus,
  backupHealth,
  backupStorage,
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
  backupHealth: {
    ready: number;
    failed: number;
    legacy: number;
    lastSuccessfulAt: string | null;
    nextScheduledAt: string | null;
    operationLock: string;
  };
  backupStorage: { configured: boolean; provider: string; missing: string[] };
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
          hint={`${backupHealth.ready} restorable backups`}
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

      <BackupsManager
        backups={backups}
        canManage={canManage}
        health={backupHealth}
        storageConfigured={backupStorage.configured}
        missingConfig={backupStorage.missing}
      />
    </div>
  );
}
