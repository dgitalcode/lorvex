import {
  bootstrapNavigationContent,
  ensureCmsDocument,
} from "@/server/actions/admin/cms";
import { requirePermission } from "@/server/auth/require-admin";
import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { NavigationBuilder } from "@/components/admin/cms/navigation-builder";
import {
  navigationDocumentContentSchema,
  type NavigationDocumentContent,
} from "@/server/validations/admin/cms";

export const metadata = { title: "Navigation" };

export default async function AdminCmsNavigationPage() {
  await requirePermission("cms.view");

  const document = await ensureCmsDocument(
    "navigation",
    "navigation",
    "Navigation",
    bootstrapNavigationContent,
  );

  const latestVersion = document.versions[0];
  const draftContent = navigationDocumentContentSchema.parse(
    latestVersion?.content ?? { menuKey: "header", menuLabel: "Header", items: [] },
  ) satisfies NavigationDocumentContent;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/cms" },
          { label: "Navigation" },
        ]}
      />
      <AdminPageHeader
        eyebrow="Content"
        title="Navigation"
        description="Manage header menu items, mega menu flags, and link order. Publish to replace the live header navigation."
      />
      <NavigationBuilder
        documentId={document.id}
        documentStatus={document.status}
        scheduledAt={document.scheduledAt?.toISOString() ?? null}
        initialContent={draftContent}
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
