import Link from "next/link";
import { requirePermission } from "@/server/auth/require-admin";
import { getCustomersForAdmin } from "@/server/actions/admin/customers";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomersTable } from "@/components/admin/customers/customers-table";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Customers" };

type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("customers.view");
  const params = await searchParams;
  const customers = await getCustomersForAdmin({
    q: params.q,
    status: params.status,
  });

  const rows = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Customers"
        description="Customer profiles, lifetime value and tags."
      />

      <form
        className="flex flex-wrap gap-3"
        action="/admin/customers"
        method="get"
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name or email…"
          className="h-9 max-w-xs flex-1 border border-border bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 border border-border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {["ACTIVE", "SUSPENDED", "DELETED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {(params.q || params.status) && (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/admin/customers">Clear</Link>
          </Button>
        )}
      </form>

      <CustomersTable data={rows} />
    </div>
  );
}
