"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustInventory } from "@/server/actions/admin/products";

const REASONS = [
  "Restock",
  "Sale",
  "Return",
  "Damage",
  "Correction",
  "Transfer",
  "Inventory count",
];

export function InventoryAdjustForm({
  variants,
}: {
  variants: { id: string; label: string; stock: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState(REASONS[0]);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const selected = variants.find((variant) => variant.id === variantId);

  return (
    <form
      className="grid gap-4 border border-border p-5 md:grid-cols-2 xl:grid-cols-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await adjustInventory({
            variantId,
            delta: Number(delta),
            reason,
            reference: reference || null,
            note: note || null,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Inventory updated");
          setReference("");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2 xl:col-span-2">
        <Label>Variant</Label>
        <Select value={variantId} onValueChange={setVariantId}>
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {variants.map((variant) => (
              <SelectItem key={variant.id} value={variant.id}>
                {variant.label} · {variant.stock} in stock
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="delta">Adjustment</Label>
        <Input
          id="delta"
          type="number"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          placeholder="+10 or -2"
        />
        {selected && (
          <p className="text-xs text-muted-foreground">
            New stock: {selected.stock + Number(delta || 0)}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="PO-1234"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
        />
      </div>
      <div className="flex items-end xl:col-span-6">
        <Button type="submit" disabled={pending || !variantId}>
          {pending ? "Saving…" : "Apply adjustment"}
        </Button>
      </div>
    </form>
  );
}
