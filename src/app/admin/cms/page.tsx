import {
  bootstrapHomepageContent,
  ensureCmsDocument,
  getLiveHomepageSections,
} from "@/server/actions/admin/cms";
import { requirePermission } from "@/server/auth/require-admin";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { AdminBreadcrumb, AdminPageHeader } from "@/components/admin/page-header";
import { HomepageBuilder } from "@/components/admin/cms/homepage-builder";
import {
  homepageDocumentContentSchema,
  type HomepageDocumentContent,
} from "@/server/validations/admin/cms";

export const metadata = { title: "Homepage builder" };

export default async function AdminCmsHomepagePage() {
  await requirePermission("cms.view");

  const [document, liveSections] = await Promise.all([
    ensureCmsDocument(
      "homepage",
      "homepage",
      "Homepage",
      bootstrapHomepageContent,
    ),
    getLiveHomepageSections(),
  ]);

  const latestVersion = document.versions[0];
  const draftContent = homepageDocumentContentSchema.parse(
    latestVersion?.content ?? { sections: [] },
  ) satisfies HomepageDocumentContent;

  return (
    <div className="space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/cms" },
          { label: "Homepage builder" },
        ]}
      />
      <AdminPageHeader
        eyebrow="Content"
        title="Homepage builder"
        description="Reorder homepage sections, edit hero and stats content, save drafts, and publish to the live storefront."
      />
      <HomepageBuilder
        documentId={document.id}
        documentStatus={document.status}
        scheduledAt={document.scheduledAt?.toISOString() ?? null}
        publishedAt={document.publishedAt?.toISOString() ?? null}
        initialContent={draftContent}
        cloudinaryConfigured={isCloudinaryConfigured()}
        liveSections={liveSections.map((section) => ({
          key: section.key,
          type: section.type,
          title: section.title,
          isVisible: section.isVisible,
          sortOrder: section.sortOrder,
        }))}
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
