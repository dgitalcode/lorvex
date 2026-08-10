import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/require-admin";
import {
  getCustomerByIdForAdmin,
  getCustomerTagsForAdmin,
} from "@/server/actions/admin/customers";
import {
  AdminBreadcrumb,
  AdminPageHeader,
} from "@/components/admin/page-header";
import { CustomerDetailActions } from "@/components/admin/customers/customer-detail-actions";
import { OrderStatusBadge } from "@/components/admin/orders/orders-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerByIdForAdmin(id);
  return { title: customer?.name ?? "Customer" };
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("customers.view");
  const { id } = await params;
  const [customer, allTags] = await Promise.all([
    getCustomerByIdForAdmin(id),
    getCustomerTagsForAdmin(),
  ]);
  if (!customer) notFound();

  const activity = [
    ...customer.auditLogs.map((log) => ({
      id: log.id,
      type: "audit" as const,
      label: log.action,
      detail: log.entity,
      at: log.createdAt,
    })),
    ...customer.analyticsEvents.map((ev) => ({
      id: ev.id,
      type: "analytics" as const,
      label: ev.name,
      detail: ev.path ?? ev.entityType ?? "",
      at: ev.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name ?? customer.email },
        ]}
      />

      <AdminPageHeader
        eyebrow="Customer"
        title={customer.name ?? customer.email}
        description={`Member since ${formatDate(customer.createdAt)}`}
        actions={<Badge variant="outline">{customer.status}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Lifetime value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">
              {formatPrice(customer.ltv, customer.orders[0]?.currency ?? "MAD")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">{customer.orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Wishlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">
              {customer.wishlistItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {customer.email}
            </p>
            {customer.phone && (
              <p>
                <span className="text-muted-foreground">Phone: </span>
                {customer.phone}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Locale: </span>
              {customer.locale}
            </p>
            <p>
              <span className="text-muted-foreground">Currency: </span>
              {customer.currency}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.addresses.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="border border-border p-4 text-sm leading-relaxed"
                  >
                    {addr.isDefault && (
                      <Badge variant="accent" className="mb-2">
                        Default
                      </Badge>
                    )}
                    <p className="font-medium">
                      {addr.firstName} {addr.lastName}
                    </p>
                    <p className="text-muted-foreground">{addr.line1}</p>
                    {addr.line2 && (
                      <p className="text-muted-foreground">{addr.line2}</p>
                    )}
                    <p className="text-muted-foreground">
                      {addr.city}, {addr.country}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No saved addresses.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customer.orders.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {order.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatPrice(Number(order.grandTotal), order.currency)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          )}
        </CardContent>
      </Card>

      {customer.wishlistItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wishlist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {customer.wishlistItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span>{item.product.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatPrice(
                      Number(item.product.basePrice),
                      item.product.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CustomerDetailActions
        userId={customer.id}
        status={customer.status}
        tags={customer.customerTags}
        allTags={allTags}
      />

      {activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {activity.slice(0, 15).map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(item.at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
