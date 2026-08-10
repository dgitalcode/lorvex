"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthStrings } from "@/i18n/auth-strings";
import { passwordStrength } from "@/lib/password-policy";
import { cn } from "@/lib/utils";
import type { Locale } from "@/config/site";
import {
  resetPasswordWithToken,
  type ResetPasswordState,
} from "@/server/actions/password-reset";

export function ResetPasswordForm({
  locale,
  token,
  tokenStatus,
}: {
  locale: Locale;
  token: string;
  tokenStatus: "valid" | "invalid" | "expired" | "used";
}) {
  const t = getAuthStrings(locale);
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<
    ResetPasswordState,
    FormData
  >(resetPasswordWithToken, {});

  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthLabel =
    strength.score <= 1
      ? t.strengthWeak
      : strength.score === 2
        ? t.strengthFair
        : strength.score === 3
          ? t.strengthGood
          : t.strengthStrong;

  if (state.ok && state.code === "SUCCESS") {
    return (
      <div className="mx-auto max-w-md border bg-card p-8" role="status">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
          LORVEX
        </p>
        <h2 className="mt-3 font-display text-3xl">{t.resetSuccessTitle}</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {t.resetSuccessBody}
        </p>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link href={`/${locale}/auth/sign-in`}>{t.signIn}</Link>
        </Button>
      </div>
    );
  }

  if (tokenStatus !== "valid") {
    const message =
      tokenStatus === "expired"
        ? t.resetExpired
        : tokenStatus === "used"
          ? t.resetUsed
          : t.resetInvalid;
    return (
      <div className="mx-auto max-w-md border bg-card p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
          LORVEX
        </p>
        <h2 className="mt-3 font-display text-3xl">{t.resetTitle}</h2>
        <p role="alert" className="mt-4 text-sm text-destructive">
          {message}
        </p>
        <Link
          href={`/${locale}/forgot-password`}
          className="mt-8 inline-block text-xs uppercase tracking-[0.18em] text-accent"
        >
          {t.backToForgot}
        </Link>
      </div>
    );
  }

  const errorMessage =
    state.code === "RATE_LIMITED"
      ? t.rateLimited
      : state.code === "PASSWORD_MISMATCH"
        ? t.passwordMismatch
        : state.code === "WEAK_PASSWORD"
          ? t.weakPassword
          : state.code === "SAME_PASSWORD"
            ? t.samePassword
            : state.code === "EXPIRED_TOKEN"
              ? t.resetExpired
              : state.code === "USED_TOKEN"
                ? t.resetUsed
                : state.code === "INVALID_TOKEN"
                  ? t.resetInvalid
                  : null;

  return (
    <div className="mx-auto max-w-md border bg-card p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
        LORVEX
      </p>
      <h2 className="mt-3 font-display text-3xl">{t.resetTitle}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t.resetSubtitle}</p>

      <form action={action} className="mt-8 space-y-5">
        <input type="hidden" name="token" value={token} />
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">{t.newPassword}</Label>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-accent"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
            >
              {show ? t.hidePassword : t.showPassword}
            </button>
          </div>
          <div className="relative mt-2">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pe-11"
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.passwordHint}</p>
          {password.length > 0 && (
            <div className="mt-3" aria-live="polite">
              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span>{t.strengthLabel}</span>
                <span>{strengthLabel}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 bg-secondary transition-colors duration-300",
                      strength.score > i &&
                        (strength.score <= 1
                          ? "bg-destructive"
                          : strength.score === 2
                            ? "bg-warning"
                            : "bg-accent"),
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className="mt-2"
          />
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? t.resetSaving : t.resetSubmit}
        </Button>
      </form>
    </div>
  );
}
