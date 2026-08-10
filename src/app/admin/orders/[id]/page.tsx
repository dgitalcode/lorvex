import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Package } from "lucide-react";
import { requirePermission } from "@/server/auth/require-admin";
import { getOrderByIdForAdmin } from "@/server/actions/admin/orders";
import {
  AdminBreadcrumb,
  AdminPageHeader,
} from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/orders/orders-table";
import { OrderDetailActions } from "@/components/admin/orders/order-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return { title: `Order ${id.slice(0, 8)}…` };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("orders.view");
  const { id } = await params;
  const order = await getOrderByIdForAdmin(id);
  if (!order) notFound();

  const addr = order.shippingAddress;

  return (
    <div className="space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Orders", href: "/admin/orders" },
          { label: order.number },
        ]}
      />

      <AdminPageHeader
        eyebrow="Order"
        title={order.number}
        description={`Placed ${formatDate(order.createdAt)} · ${order.email}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Badge variant="outline">{order.paymentStatus}</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/orders/${order.id}/invoice`} target="_blank">
                <FileText className="mr-2 h-4 w-4" />
                Invoice PDF
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/orders/${order.id}/label`} target="_blank">
                <Package className="mr-2 h-4 w-4" />
                Shipping label
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(Number(item.unitPrice), order.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(Number(item.totalPrice), order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-2 border-t border-border p-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(Number(order.subtotal), order.currency)}</span>
              </div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>
                    −{formatPrice(Number(order.discountTotal), order.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {formatPrice(Number(order.shippingTotal), order.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                <span>Total</span>
                <span>
                  {formatPrice(Number(order.grandTotal), order.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.email}</p>
              {order.phone && (
                <p className="text-muted-foreground">{order.phone}</p>
              )}
              {order.user && (
                <Link
                  href={`/admin/customers/${order.user.id}`}
                  className="text-accent hover:underline"
                >
                  View customer profile
                </Link>
              )}
            </CardContent>
          </Card>

          {addr && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">
                  {addr.firstName} {addr.lastName}
                </p>
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.city}
                  {addr.region ? `, ${addr.region}` : ""}{" "}
                  {addr.postalCode ?? ""}
                </p>
                <p>{addr.country}</p>
                <p className="mt-2">{addr.phone}</p>
                {order.shippingMethod && (
                  <p className="mt-3 text-foreground">
                    {order.shippingMethod.name}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle>Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-mono">{order.trackingNumber}</p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-accent hover:underline"
                  >
                    Track shipment
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6 border-l border-border pl-6">
            {order.statusHistory.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[calc(0.75rem+1px)] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={entry.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                {entry.note && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.note}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {order.orderNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {order.orderNotes.map((note) => (
              <div key={note.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm">{note.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.author?.name ?? note.author?.email ?? "Staff"} ·{" "}
                  {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {order.refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex justify-between border border-border p-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatPrice(Number(refund.amount), order.currency)}
                  </p>
                  <p className="text-muted-foreground">{refund.reason}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(refund.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <OrderDetailActions
        orderId={order.id}
        status={order.status}
        currency={order.currency}
        grandTotal={Number(order.grandTotal)}
        items={order.items.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
        }))}
        trackingNumber={order.trackingNumber}
        trackingUrl={order.trackingUrl}
      />
    </div>
  );
}
