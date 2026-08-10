import {
  bootstrapFooterContent,
  ensureCmsDocument,
} from "@/server/actions/admin/cms";
import { requirePermission } from "@/server/auth/require-admin";
import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { FooterBuilder } from "@/components/admin/cms/footer-builder";
import {
  footerDocumentContentSchema,
  type FooterDocumentContent,
} from "@/server/validations/admin/cms";

export const metadata = { title: "Footer" };

export default async function AdminCmsFooterPage() {
  await requirePermission("cms.view");

  const document = await ensureCmsDocument(
    "footer",
    "footer",
    "Footer",
    bootstrapFooterContent,
  );

  const latestVersion = document.versions[0];
  const draftContent = footerDocumentContentSchema.parse(
    latestVersion?.content ?? { columns: [] },
  ) satisfies FooterDocumentContent;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/cms" },
          { label: "Footer" },
        ]}
      />
      <AdminPageHeader
        eyebrow="Content"
        title="Footer"
        description="Manage footer columns and links. Publishing replaces all live footer columns."
      />
      <FooterBuilder
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
