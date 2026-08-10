"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
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
import { adjustLoyaltyPoints, createReferralCode } from "@/server/actions/admin/marketing";

export type AdminLoyaltyRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  points: number;
  tier: string;
  updatedAt: string;
};

export type AdminReferralRow = {
  id: string;
  code: string;
  userEmail: string;
  uses: number;
  rewardPoints: number;
  createdAt: string;
};

type Props = {
  accounts: AdminLoyaltyRow[];
  referrals: AdminReferralRow[];
  customers: { id: string; email: string; name: string | null }[];
};

export function LoyaltyManager({ accounts, referrals, customers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adjustAccountId, setAdjustAccountId] = useState("");
  const [delta, setDelta] = useState(100);
  const [reason, setReason] = useState("");
  const [referralUserId, setReferralUserId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [rewardPoints, setRewardPoints] = useState(100);

  const accountColumns = useMemo<ColumnDef<AdminLoyaltyRow>[]>(
    () => [
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.userName ?? row.original.userEmail}</p>
            <p className="text-xs text-muted-foreground">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "points",
        header: "Points",
        cell: ({ row }) => row.original.points.toLocaleString("fr-MA"),
      },
      {
        accessorKey: "tier",
        header: "Tier",
        cell: ({ row }) => <Badge variant="outline">{row.original.tier}</Badge>,
      },
    ],
    [],
  );

  const referralColumns = useMemo<ColumnDef<AdminReferralRow>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "userEmail", header: "Owner" },
      {
        accessorKey: "uses",
        header: "Uses",
        cell: ({ row }) => row.original.uses.toLocaleString("fr-MA"),
      },
      {
        accessorKey: "rewardPoints",
        header: "Reward pts",
        cell: ({ row }) => row.original.rewardPoints.toLocaleString("fr-MA"),
      },
    ],
    [],
  );

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4 border border-border p-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await adjustLoyaltyPoints({
                accountId: adjustAccountId,
                delta,
                reason,
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Loyalty points adjusted");
              setReason("");
              router.refresh();
            });
          }}
        >
          <h2 className="font-display text-xl">Adjust points</h2>
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={adjustAccountId} onValueChange={setAdjustAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select loyalty account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.userEmail} ({account.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loyalty-delta">Delta (+/-)</Label>
            <Input
              id="loyalty-delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loyalty-reason">Reason</Label>
            <Input
              id="loyalty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Manual adjustment, goodwill credit…"
              required
            />
          </div>
          <Button type="submit" disabled={pending || !adjustAccountId}>
            {pending ? "Saving…" : "Apply adjustment"}
          </Button>
        </form>

        <form
          className="space-y-4 border border-border p-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await createReferralCode({
                userId: referralUserId,
                code: referralCode || undefined,
                rewardPoints,
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Referral code created");
              setReferralCode("");
              setReferralUserId("");
              router.refresh();
            });
          }}
        >
          <h2 className="font-display text-xl">Create referral code</h2>
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={referralUserId} onValueChange={setReferralUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name ?? customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref-code">Code (optional)</Label>
            <Input
              id="ref-code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Auto-generated if empty"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref-reward">Reward points</Label>
            <Input
              id="ref-reward"
              type="number"
              min={0}
              value={rewardPoints}
              onChange={(e) => setRewardPoints(Number(e.target.value))}
            />
          </div>
          <Button type="submit" disabled={pending || !referralUserId}>
            {pending ? "Creating…" : "Create referral code"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 font-display text-2xl">Loyalty accounts</h2>
        <DataTable
          columns={accountColumns}
          data={accounts}
          searchKey="userEmail"
          searchPlaceholder="Search by email…"
          emptyMessage="No loyalty accounts yet."
        />
      </div>

      <div>
        <h2 className="mb-4 font-display text-2xl">Referral codes</h2>
        <DataTable
          columns={referralColumns}
          data={referrals}
          searchKey="code"
          searchPlaceholder="Search referral codes…"
          emptyMessage="No referral codes yet."
        />
      </div>
    </div>
  );
}
