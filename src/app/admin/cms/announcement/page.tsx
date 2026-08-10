import {
  bootstrapAnnouncementContent,
  ensureCmsDocument,
} from "@/server/actions/admin/cms";
import { requirePermission } from "@/server/auth/require-admin";
import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { AnnouncementBuilder } from "@/components/admin/cms/announcement-builder";
import {
  announcementDocumentContentSchema,
  type AnnouncementDocumentContent,
} from "@/server/validations/admin/cms";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Announcement" };

export default async function AdminCmsAnnouncementPage() {
  await requirePermission("cms.view");

  const [document, liveBar] = await Promise.all([
    ensureCmsDocument(
      "announcement",
      "announcement",
      "Announcement bar",
      bootstrapAnnouncementContent,
    ),
    prisma.announcementBar.findFirst({
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const latestVersion = document.versions[0];
  const draftContent = announcementDocumentContentSchema.parse(
    latestVersion?.content ?? {
      message: "",
      href: null,
      isActive: false,
      startsAt: null,
      endsAt: null,
    },
  ) satisfies AnnouncementDocumentContent;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/cms" },
          { label: "Announcement" },
        ]}
      />
      <AdminPageHeader
        eyebrow="Content"
        title="Announcement bar"
        description="Edit the storefront announcement message, optional link, active state, and schedule window."
      />
      <AnnouncementBuilder
        documentId={document.id}
        documentStatus={document.status}
        scheduledAt={document.scheduledAt?.toISOString() ?? null}
        publishedAt={document.publishedAt?.toISOString() ?? null}
        initialContent={draftContent}
        liveMessage={liveBar?.message ?? null}
        liveActive={liveBar?.isActive ?? false}
        versions={document.versions.map((version) => ({
          version: version.version,
          note: version.note,
          createdAt: version.createdAt.toISOString(),
          author:
            version.author?.name ??
            version.author?.email ??
            "System",
        }))}
      />
    </div>
  );
}
