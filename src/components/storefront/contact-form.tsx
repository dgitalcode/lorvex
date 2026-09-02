"use client";

import { useActionState } from "react";
import type { Locale } from "@/config/site";
import { storefrontCopy } from "@/content/storefront-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitContactEnquiry,
  type ContactFormState,
} from "@/server/actions/contact";

export function ContactForm({ locale }: { locale: Locale }) {
  const copy = storefrontCopy(locale);
  const [state, action, pending] = useActionState<ContactFormState, FormData>(
    submitContactEnquiry,
    {},
  );

  if (state.ok) {
    return (
      <div className="border bg-card p-8" role="status">
        <h2 className="font-display text-3xl">{copy.contactFormTitle}</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {copy.contactSuccess}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="border bg-card p-8">
      <h2 className="font-display text-3xl">{copy.contactFormTitle}</h2>
      <input type="hidden" name="locale" value={locale} />
      <div className="sr-only" aria-hidden>
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={copy.contactName} name="name" />
        <Field label={copy.contactEmail} name="email" type="email" />
        <div className="sm:col-span-2">
          <Field label={copy.contactSubject} name="subject" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="message">{copy.contactMessage}</Label>
          <Textarea
            id="message"
            name="message"
            required
            minLength={10}
            className="mt-2 min-h-36"
          />
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="mt-6" disabled={pending}>
        {copy.contactSubmit}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required className="mt-2" {...props} />
    </div>
  );
}
