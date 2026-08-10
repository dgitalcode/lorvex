"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { createOrder, type CheckoutState } from "@/server/actions/checkout";
import type { Locale } from "@/config/site";

type Shipping = { id: string; name: string; description: string | null; price: number; estimatedDays: number | null };
const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir", "Meknès", "Oujda", "Tétouan", "El Jadida"];

export function CheckoutForm({ locale, shippingMethods }: { locale: Locale; shippingMethods: Shipping[] }) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(createOrder, {});
  const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const currency = items[0]?.currency ?? "MAD";

  useEffect(() => {
    if (state.success && state.number) {
      clear();
      router.push(`/${locale}/order/${state.number}`);
    }
  }, [clear, locale, router, state.number, state.success]);

  if (!items.length && !state.success) return <div className="py-20 text-center"><h2 className="font-display text-4xl">Your cart is empty</h2><Button className="mt-6" onClick={() => router.push(`/${locale}/shop`)}>Return to shop</Button></div>;

  return <form action={action} className="grid gap-10 lg:grid-cols-[1fr_390px]">
    <input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="items" value={JSON.stringify(items.map(({ variantId, quantity }) => ({ variantId, quantity })))} />
    <div className="space-y-10">
      <fieldset><legend className="font-display text-3xl">Contact</legend><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Email" name="email" type="email" autoComplete="email" /><Field label="Phone" name="phone" type="tel" autoComplete="tel" /></div></fieldset>
      <fieldset><legend className="font-display text-3xl">Shipping address</legend><div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" /><Field label="Last name" name="lastName" autoComplete="family-name" />
        <div className="sm:col-span-2"><Field label="Address" name="line1" autoComplete="address-line1" /></div>
        <div className="sm:col-span-2"><Field label="Apartment, suite (optional)" name="line2" autoComplete="address-line2" required={false} /></div>
        <div><Label htmlFor="city">City</Label><select id="city" name="city" required defaultValue="Casablanca" className="mt-2 h-11 w-full border bg-background px-3 text-sm">{cities.map((city) => <option key={city}>{city}</option>)}</select></div>
        <Field label="Region (optional)" name="region" required={false} /><Field label="Postal code (optional)" name="postalCode" autoComplete="postal-code" required={false} />
      </div></fieldset>
      <fieldset><legend className="font-display text-3xl">Delivery</legend><div className="mt-5 space-y-3">{shippingMethods.map((method, index) => <label key={method.id} className="flex cursor-pointer items-center justify-between border p-4"><span><input type="radio" name="shippingMethodId" value={method.id} defaultChecked={index === 0} required className="mr-3 accent-[var(--accent)]" /><strong>{method.name}</strong><small className="ml-3 text-muted-foreground">{method.description ?? (method.estimatedDays ? `${method.estimatedDays} days` : "")}</small></span><span>{method.price ? formatPrice(method.price, currency) : "Free"}</span></label>)}</div></fieldset>
      <fieldset><legend className="font-display text-3xl">Payment</legend><div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 border p-4"><input type="radio" name="paymentMethod" value="COD" defaultChecked className="accent-[var(--accent)]" /><Landmark className="h-5 w-5" /><span><strong className="block">Cash on delivery</strong><small className="text-muted-foreground">Pay when delivered</small></span></label>
        <label className="flex cursor-pointer items-center gap-3 border p-4"><input type="radio" name="paymentMethod" value="CARD" className="accent-[var(--accent)]" /><CreditCard className="h-5 w-5" /><span><strong className="block">Card</strong><small className="text-muted-foreground">Payment arranged securely</small></span></label>
      </div></fieldset>
      <div><Label htmlFor="notes">Order notes (optional)</Label><Textarea id="notes" name="notes" className="mt-2" maxLength={1000} /></div>
    </div>
    <aside className="h-fit border bg-card p-7 lg:sticky lg:top-[var(--page-offset)]">
      <h2 className="font-display text-3xl">Your order</h2>
      <div className="mt-5 space-y-4">{items.map((line) => <div key={line.variantId} className="flex justify-between gap-4 text-sm"><span>{line.name} <span className="text-muted-foreground">× {line.quantity}</span></span><span>{formatPrice(line.price * line.quantity, line.currency)}</span></div>)}</div>
      <div className="mt-6 flex justify-between border-t pt-5"><span>Subtotal</span><strong>{formatPrice(subtotal, currency)}</strong></div>
      <div className="mt-5"><Label htmlFor="couponCode">Coupon</Label><Input id="couponCode" name="couponCode" className="mt-2 uppercase" /></div>
      {state.error && <p role="alert" className="mt-5 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="xl" disabled={pending || !shippingMethods.length} className="mt-7 w-full">{pending ? "Placing order…" : "Place order"}</Button>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Secure encrypted checkout</p>
    </aside>
  </form>;
}

function Field({ label, name, required = true, ...props }: { label: string; name: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} required={required} className="mt-2" {...props} /></div>;
}
