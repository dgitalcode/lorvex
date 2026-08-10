import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/require-admin";
import { AuditLogsTable } from "@/components/admin/system/audit-logs-table";

export const metadata = { title: "Audit logs" };

export default async function AdminAuditLogsPage() {
  await requirePermission("system.view");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: { select: { email: true } },
    },
  });

  return (
    <AuditLogsTable
      data={logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        userEmail: log.user?.email ?? null,
        ip: log.ip,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}
