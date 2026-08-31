"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { createOrder, type CheckoutState } from "@/server/actions/checkout";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/config/site";

type Shipping = { id: string; name: string; description: string | null; price: number; estimatedDays: number | null };
const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir", "Meknès", "Oujda", "Tétouan", "El Jadida"];

export function CheckoutForm({ locale, shippingMethods }: { locale: Locale; shippingMethods: Shipping[] }) {
  const t = getDictionary(locale).checkout;
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(createOrder, {});
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const currency = items[0]?.currency ?? "MAD";

  useEffect(() => {
    if (state.success && state.number) {
      const storageKey = `lorvex-order-k:${state.number}`;
      if (state.accessToken) {
        try {
          sessionStorage.setItem(storageKey, state.accessToken);
        } catch {
          /* ignore */
        }
      }
      let access = state.accessToken;
      if (!access) {
        try {
          access = sessionStorage.getItem(storageKey) ?? undefined;
        } catch {
          access = undefined;
        }
      }
      clear();
      const qs = access ? `?k=${encodeURIComponent(access)}` : "";
      router.push(`/${locale}/order/${state.number}${qs}`);
    }
  }, [clear, locale, router, state.accessToken, state.number, state.success]);

  if (!items.length && !state.success) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-display text-4xl">{t.emptyCart}</h2>
        <Button className="mt-6" onClick={() => router.push(`/${locale}/shop`)}>
          {t.returnToShop}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="paymentMethod" value="COD" />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map(({ variantId, quantity }) => ({ variantId, quantity })))}
      />
      <div className="min-w-0 space-y-10">
        <fieldset>
          <legend className="font-display text-3xl">{t.contact}</legend>
          <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
            <Field label={t.email} name="email" type="email" autoComplete="email" />
            <Field label={t.phone} name="phone" type="tel" autoComplete="tel" />
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display text-3xl">{t.shippingAddress}</legend>
          <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
            <Field label={t.firstName} name="firstName" autoComplete="given-name" />
            <Field label={t.lastName} name="lastName" autoComplete="family-name" />
            <div className="min-w-0 sm:col-span-2">
              <Field label={t.address} name="line1" autoComplete="address-line1" />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <Field label={t.apartment} name="line2" autoComplete="address-line2" required={false} />
            </div>
            <div className="min-w-0">
              <Label htmlFor="city">{t.city}</Label>
              <select
                id="city"
                name="city"
                required
                defaultValue="Casablanca"
                className="mt-2 h-11 w-full min-w-0 max-w-full border bg-background px-3 text-sm"
              >
                {cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </div>
            <Field label={t.region} name="region" required={false} />
            <Field label={t.postalCode} name="postalCode" autoComplete="postal-code" required={false} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display text-3xl">{t.delivery}</legend>
          <div className="mt-5 space-y-3">
            {shippingMethods.map((method, index) => (
              <label key={method.id} className="flex cursor-pointer items-center justify-between border p-4">
                <span>
                  <input
                    type="radio"
                    name="shippingMethodId"
                    value={method.id}
                    defaultChecked={index === 0}
                    required
                    className="mr-3 accent-[var(--accent)]"
                  />
                  <strong>{method.name}</strong>
                  <small className="ml-3 text-muted-foreground">
                    {method.description ?? (method.estimatedDays ? `${method.estimatedDays} ${t.days}` : "")}
                  </small>
                </span>
                <span>{method.price ? formatPrice(method.price, currency) : t.free}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-display text-3xl">{t.payment}</legend>
          <div className="mt-5 grid gap-3">
            <label className="flex items-center gap-3 border p-4">
              <Landmark className="h-5 w-5" />
              <span>
                <strong className="block">{t.cashOnDelivery}</strong>
                <small className="text-muted-foreground">{t.cashOnDeliveryHint}</small>
              </span>
            </label>
          </div>
        </fieldset>
        <div>
          <Label htmlFor="notes">{t.notesOptional}</Label>
          <Textarea id="notes" name="notes" className="mt-2" maxLength={1000} />
        </div>
      </div>
      <aside className="h-fit border bg-card p-7 lg:sticky lg:top-[var(--page-offset)]">
        <h2 className="font-display text-3xl">{t.yourOrder}</h2>
        <div className="mt-5 space-y-4">
          {items.map((line) => (
            <div key={line.variantId} className="flex justify-between gap-4 text-sm">
              <span>
                {line.name} <span className="text-muted-foreground">× {line.quantity}</span>
              </span>
              <span>{formatPrice(line.price * line.quantity, line.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between border-t pt-5">
          <span>{t.subtotal}</span>
          <strong>{formatPrice(subtotal, currency)}</strong>
        </div>
        <div className="mt-5">
          <Label htmlFor="couponCode">{t.coupon}</Label>
          <Input id="couponCode" name="couponCode" className="mt-2 uppercase" />
        </div>
        {state.error && (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="xl" disabled={pending || !shippingMethods.length} className="mt-7 w-full">
          {pending ? t.placingOrder : t.placeOrder}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" /> {t.secureCheckout}
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  required = true,
  ...props
}: { label: string; name: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} className="mt-2" {...props} />
    </div>
  );
}
