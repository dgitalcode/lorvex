"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthStrings } from "@/i18n/auth-strings";
import type { Locale } from "@/config/site";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "@/server/actions/password-reset";

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = getAuthStrings(locale);
  const [state, action, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(requestPasswordReset, {});

  if (state.ok && state.code === "GENERIC") {
    return (
      <div className="mx-auto max-w-md border bg-card p-8" role="status">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
          LORVEX
        </p>
        <h2 className="mt-3 font-display text-3xl">{t.forgotTitle}</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {t.forgotSuccess}
        </p>
        <Link
          href={`/${locale}/auth/sign-in`}
          className="mt-8 inline-block text-xs uppercase tracking-[0.18em] text-accent transition-colors hover:text-foreground"
        >
          {t.signIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md border bg-card p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
        LORVEX
      </p>
      <h2 className="mt-3 font-display text-3xl">{t.forgotTitle}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t.forgotSubtitle}</p>
      <form action={action} className="mt-8 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2"
            autoFocus
          />
        </div>
        {state.code === "INVALID_EMAIL" && (
          <p role="alert" className="text-sm text-destructive">
            {t.forgotInvalidEmail}
          </p>
        )}
        {state.code === "RATE_LIMITED" && (
          <p role="alert" className="text-sm text-destructive">
            {t.rateLimited}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? t.forgotSending : t.forgotSubmit}
        </Button>
        <Link
          href={`/${locale}/auth/sign-in`}
          className="block text-center text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
        >
          {t.backToSignIn}
        </Link>
      </form>
    </div>
  );
}
