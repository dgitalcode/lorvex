import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/server/auth/require-admin";

export const metadata = {
  title: {
    default: "LORVEX Admin",
    template: "%s · LORVEX Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminSession();
  return <AdminShell user={user}>{children}</AdminShell>;
}
