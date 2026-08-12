"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, type RegisterState } from "@/server/actions/auth";
import { getAuthStrings } from "@/i18n/auth-strings";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import type { Locale } from "@/config/site";

type Step = "credentials" | "totp" | "backup";

export function SignInForm({
  locale,
  callbackUrl,
}: {
  locale: Locale;
  callbackUrl?: string;
}) {
  const t = getAuthStrings(locale);
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [registerState, registerAction, registerPending] = useActionState<
    RegisterState,
    FormData
  >(registerUser, {});
  const showRegistration = registering && !registerState.success && step === "credentials";

  async function goToPostLoginDestination() {
    const session = await getSession();
    const destination = resolvePostLoginPath({
      role: session?.user?.role,
      locale,
      callbackUrl,
    });
    router.push(destination);
    router.refresh();
  }

  async function completeSignIn(otpValue?: string) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      otp: otpValue || undefined,
      redirect: false,
    });
    setLoading(false);

    if (!result) {
      setError(t.invalidCredentials);
      return;
    }

    const code = (result as { code?: string }).code ?? result.error;

    if (code === "2FA_REQUIRED" || result.error === "2FA_REQUIRED") {
      setStep("totp");
      setOtp("");
      return;
    }

    if (code === "RATE_LIMITED" || result.error === "RATE_LIMITED") {
      setError(t.rateLimited);
      return;
    }

    if (result.error) {
      setError(step === "credentials" ? t.invalidCredentials : t.invalidCode);
      return;
    }

    await goToPostLoginDestination();
  }

  async function onCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "");
    const nextPassword = String(form.get("password") ?? "");
    setEmail(nextEmail);
    setPassword(nextPassword);
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: nextEmail,
      password: nextPassword,
      redirect: false,
    });
    setLoading(false);

    if (!result) {
      setError(t.invalidCredentials);
      return;
    }

    const code = (result as { code?: string }).code ?? result.error;

    if (code === "2FA_REQUIRED" || result.error === "2FA_REQUIRED") {
      setStep("totp");
      setOtp("");
      return;
    }

    if (code === "RATE_LIMITED" || result.error === "RATE_LIMITED") {
      setError(t.rateLimited);
      return;
    }

    if (result.error) {
      setError(t.invalidCredentials);
      return;
    }

    await goToPostLoginDestination();
  }

  async function onOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await completeSignIn(otp);
  }

  if (step === "totp" || step === "backup") {
    const isBackup = step === "backup";
    return (
      <div className="mx-auto max-w-md border bg-card p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
          LORVEX
        </p>
        <h2 className="mt-3 font-display text-3xl">{t.twoFactorTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isBackup ? t.backupHint : t.twoFactorHint}
        </p>
        <form onSubmit={onOtpSubmit} className="mt-7 space-y-5">
          <div>
            <Label htmlFor="otp">{isBackup ? t.backupLabel : t.totpLabel}</Label>
            <Input
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              autoComplete="one-time-code"
              inputMode={isBackup ? "text" : "numeric"}
              placeholder={
                isBackup ? t.backupPlaceholder : t.totpPlaceholder
              }
              required
              autoFocus
              className="mt-2 font-mono tracking-wider"
              aria-describedby="otp-hint"
            />
            <p id="otp-hint" className="sr-only">
              {isBackup ? t.backupHint : t.twoFactorHint}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? t.verifying : t.verify}
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
              onClick={() => {
                setStep(isBackup ? "totp" : "backup");
                setOtp("");
                setError("");
              }}
            >
              {isBackup ? t.useTotp : t.useBackup}
            </button>
            <button
              type="button"
              className="text-left text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent sm:text-right"
              onClick={() => {
                setStep("credentials");
                setPassword("");
                setOtp("");
                setError("");
              }}
            >
              {t.backToSignIn}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md border bg-card p-8">
      <div className="mb-7 flex border-b">
        <button
          type="button"
          className={`flex-1 border-b-2 pb-4 text-xs uppercase tracking-[0.18em] ${
            !showRegistration
              ? "border-accent"
              : "border-transparent text-muted-foreground"
          }`}
          onClick={() => setRegistering(false)}
        >
          {t.signIn}
        </button>
        <button
          type="button"
          className={`flex-1 border-b-2 pb-4 text-xs uppercase tracking-[0.18em] ${
            showRegistration
              ? "border-accent"
              : "border-transparent text-muted-foreground"
          }`}
          onClick={() => setRegistering(true)}
        >
          {t.createAccount}
        </button>
      </div>
      {!showRegistration ? (
        <form onSubmit={onCredentialsSubmit} className="space-y-5">
          <Field
            name="email"
            label={t.email}
            type="email"
            autoComplete="email"
            defaultValue={email}
          />
          <Field
            name="password"
            label={t.password}
            type="password"
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-accent"
            >
              {t.forgotPassword}
            </Link>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {registerState.success && (
            <p className="text-sm text-success">{t.accountReady}</p>
          )}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? t.signingIn : t.signIn}
          </Button>
        </form>
      ) : (
        <form action={registerAction} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid grid-cols-2 gap-4">
            <Field
              name="firstName"
              label={t.firstName}
              autoComplete="given-name"
            />
            <Field
              name="lastName"
              label={t.lastName}
              autoComplete="family-name"
            />
          </div>
          <Field name="email" label={t.email} type="email" autoComplete="email" />
          <Field
            name="password"
            label={t.password}
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
          {registerState.error && (
            <p role="alert" className="text-sm text-destructive">
              {registerState.error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={registerPending}
            className="w-full"
          >
            {registerPending ? t.creating : t.createAccount}
          </Button>
        </form>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  ...props
}: { name: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required className="mt-2" {...props} />
    </div>
  );
}
