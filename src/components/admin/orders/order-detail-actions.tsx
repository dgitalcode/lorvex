"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderStatus, ReturnStatus } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addOrderNote,
  createRefund,
  createReturnRequest,
  updateOrderStatus,
  updateTracking,
} from "@/server/actions/admin/orders";
import { getAllowedOrderTransitions } from "@/server/validations/admin/order";

type OrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type Props = {
  orderId: string;
  status: OrderStatus;
  currency: string;
  grandTotal: number;
  items: OrderItem[];
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export function OrderDetailActions({
  orderId,
  status,
  currency,
  grandTotal,
  items,
  trackingNumber,
  trackingUrl,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState({
    number: trackingNumber ?? "",
    url: trackingUrl ?? "",
  });
  const [refund, setRefund] = useState({ amount: "", reason: "" });
  const [returnForm, setReturnForm] = useState({
    reason: "",
    orderItemId: items[0]?.id ?? "",
    quantity: 1,
  });

  const allowed = getAllowedOrderTransitions(status);

  function refresh() {
    router.refresh();
  }

  function handleStatus(next: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus({
        orderId,
        status: next,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Status updated to ${next.replace(/_/g, " ")}`);
        refresh();
      }
    });
  }

  function handleNote(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addOrderNote({ orderId, body: note });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Note added");
        setNote("");
        refresh();
      }
    });
  }

  function handleTracking(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTracking({
        orderId,
        trackingNumber: tracking.number,
        trackingUrl: tracking.url || undefined,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tracking updated");
        refresh();
      }
    });
  }

  function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createRefund({
        orderId,
        reason: refund.reason,
        amount: refund.amount ? Number(refund.amount) : undefined,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Refund processed");
        setRefund({ amount: "", reason: "" });
        refresh();
      }
    });
  }

  function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const item = items.find((i) => i.id === returnForm.orderItemId);
      if (!item) return;
      const result = await createReturnRequest({
        orderId,
        reason: returnForm.reason,
        items: [
          {
            orderItemId: returnForm.orderItemId,
            quantity: returnForm.quantity,
          },
        ],
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Return request created");
        setReturnForm({ ...returnForm, reason: "" });
        refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {allowed.length ? (
            allowed.map((next) => (
              <Button
                key={next}
                variant={next === "CANCELLED" ? "outline" : "default"}
                size="sm"
                disabled={pending}
                onClick={() => handleStatus(next)}
              >
                → {next.replace(/_/g, " ")}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No further transitions available.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTracking} className="space-y-3">
            <div>
              <Label htmlFor="trackingNumber">Tracking number</Label>
              <Input
                id="trackingNumber"
                value={tracking.number}
                onChange={(e) =>
                  setTracking({ ...tracking, number: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
              <Input
                id="trackingUrl"
                type="url"
                value={tracking.url}
                onChange={(e) =>
                  setTracking({ ...tracking, url: e.target.value })
                }
                placeholder="https://"
              />
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              Save tracking
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNote} className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note…"
              rows={3}
              required
            />
            <Button type="submit" size="sm" disabled={pending}>
              Add note
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refund</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRefund} className="space-y-3">
            <div>
              <Label htmlFor="refundAmount">
                Amount ({currency}) — leave empty for full refund (
                {grandTotal.toFixed(2)})
              </Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={grandTotal}
                value={refund.amount}
                onChange={(e) =>
                  setRefund({ ...refund, amount: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="refundReason">Reason</Label>
              <Input
                id="refundReason"
                value={refund.reason}
                onChange={(e) =>
                  setRefund({ ...refund, reason: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              Issue refund
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Return request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReturn} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Item</Label>
                <Select
                  value={returnForm.orderItemId}
                  onValueChange={(v) =>
                    setReturnForm({ ...returnForm, orderItemId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} × {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="returnQty">Quantity</Label>
                <Input
                  id="returnQty"
                  type="number"
                  min={1}
                  max={
                    items.find((i) => i.id === returnForm.orderItemId)
                      ?.quantity ?? 1
                  }
                  value={returnForm.quantity}
                  onChange={(e) =>
                    setReturnForm({
                      ...returnForm,
                      quantity: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="returnReason">Reason</Label>
                <Input
                  id="returnReason"
                  value={returnForm.reason}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, reason: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                Create return
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const RETURN_STATUSES: ReturnStatus[] = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "REFUNDED",
];

export function ReturnStatusSelect({
  returnId,
  current,
}: {
  returnId: string;
  current: ReturnStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(current);

  function handleChange(value: ReturnStatus) {
    setStatus(value);
    startTransition(async () => {
      const { updateReturnStatus } = await import(
        "@/server/actions/admin/orders"
      );
      const result = await updateReturnStatus({ returnId, status: value });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Return status updated");
        router.refresh();
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="h-8 w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RETURN_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
