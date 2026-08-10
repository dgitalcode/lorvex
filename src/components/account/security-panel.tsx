"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Copy, Download, KeyRound, Shield, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import {
  disableTwoFactor,
  enableTwoFactor,
  getSecurityOverview,
  regenerateBackupCodes,
  revokeDeviceSession,
  setupTwoFactor,
} from "@/server/actions/security";
import {
  getSecurityStrings,
  type SecurityStrings,
} from "@/i18n/auth-strings";
import type { Locale } from "@/config/site";

type Overview = Extract<
  Awaited<ReturnType<typeof getSecurityOverview>>,
  { ok: true }
>;

function BackupCodesReveal({
  codes,
  t,
  onDismiss,
}: {
  codes: string[];
  t: SecurityStrings;
  onDismiss?: () => void;
}) {
  function copyAll() {
    void navigator.clipboard.writeText(codes.join("\n"));
    toast.success(t.copied);
  }

  function download() {
    const body = [
      "LORVEX backup codes",
      "Keep these codes secure. Each code works once.",
      "",
      ...codes,
      "",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lorvex-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="mt-4 border border-accent/40 bg-secondary/40 p-4"
      role="status"
    >
      <p className="font-medium text-sm">{t.backupStore}</p>
      <p className="mt-2 text-xs leading-relaxed text-destructive">
        {t.backupWarning}
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm tracking-wide">
        {codes.map((code) => (
          <li
            key={code}
            className="border border-border/70 bg-background/70 px-3 py-2 text-center"
          >
            {code}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copyAll}>
          <Copy className="me-2 h-3.5 w-3.5" />
          {t.copyCodes}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={download}>
          <Download className="me-2 h-3.5 w-3.5" />
          {t.downloadCodes}
        </Button>
        {onDismiss && (
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            {t.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SecurityPanel({ locale }: { locale: Locale }) {
  const t = getSecurityStrings(locale);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [backups, setBackups] = useState<string[] | null>(null);
  const [regenPassword, setRegenPassword] = useState("");
  const [showRegen, setShowRegen] = useState(false);
  const [pending, startTransition] = useTransition();

  function redirectToSignIn() {
    toast.error(t.sessionExpired);
    window.location.href = `/${locale}/auth/sign-in`;
  }

  function refresh() {
    startTransition(async () => {
      const data = await getSecurityOverview();
      if (!data.ok) {
        redirectToSignIn();
        return;
      }
      setOverview(data);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!overview) {
    return (
      <div className="border border-border bg-card p-6 text-sm text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl">{t.twoFactor}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.status}:{" "}
              <strong>
                {overview.twoFactorEnabled ? t.enabled : t.disabled}
              </strong>
            </p>

            {!overview.twoFactorEnabled && !qr && (
              <Button
                className="mt-4"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setupTwoFactor();
                    if (!result.ok) {
                      toast.error(result.error);
                      if (result.error.includes("sign in")) redirectToSignIn();
                      return;
                    }
                    setQr(result.qrDataUrl);
                    setSecret(result.secret);
                  })
                }
              >
                {t.setUp}
              </Button>
            )}

            {qr && (
              <div className="mt-4 space-y-3">
                <Image
                  src={qr}
                  alt="2FA QR code"
                  width={180}
                  height={180}
                  unoptimized
                />
                <p className="text-xs text-muted-foreground break-all">
                  {t.secret}: <code>{secret}</code>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={t.codePlaceholder}
                    className="max-w-[160px]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <Button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await enableTwoFactor(token);
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success(t.enabledToast);
                        setBackups(result.backupCodes);
                        setQr(null);
                        setToken("");
                        refresh();
                      })
                    }
                  >
                    {t.confirm}
                  </Button>
                </div>
              </div>
            )}

            {overview.twoFactorEnabled && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t.disablePlaceholder}
                  className="max-w-[180px]"
                  autoComplete="one-time-code"
                />
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await disableTwoFactor(token);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(t.disabledToast);
                      setToken("");
                      setBackups(null);
                      setShowRegen(false);
                      refresh();
                    })
                  }
                >
                  {t.disable}
                </Button>
              </div>
            )}

            {backups && (
              <BackupCodesReveal
                codes={backups}
                t={t}
                onDismiss={() => setBackups(null)}
              />
            )}
          </div>
        </div>
      </section>

      {overview.twoFactorEnabled && (
        <section className="border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl">{t.backupTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.backupIntro}
              </p>
              <p className="mt-3 text-sm">
                {t.backupRemaining.replace(
                  "{count}",
                  String(overview.backupCodesRemaining),
                )}
              </p>

              {!showRegen ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setShowRegen(true)}
                >
                  {t.regenerate}
                </Button>
              ) : (
                <div className="mt-4 max-w-md space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {t.regenerateHint}
                  </p>
                  <div>
                    <Label htmlFor="regen-password">{t.passwordConfirm}</Label>
                    <Input
                      id="regen-password"
                      type="password"
                      autoComplete="current-password"
                      value={regenPassword}
                      onChange={(e) => setRegenPassword(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={pending || regenPassword.length < 8}
                      onClick={() =>
                        startTransition(async () => {
                          const result =
                            await regenerateBackupCodes(regenPassword);
                          if (!result.ok) {
                            toast.error(result.error);
                            if (result.error.includes("sign in")) {
                              redirectToSignIn();
                            }
                            return;
                          }
                          toast.success(t.regenerated);
                          setBackups(result.backupCodes);
                          setRegenPassword("");
                          setShowRegen(false);
                          refresh();
                        })
                      }
                    >
                      {pending ? t.regenerating : t.regenerate}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowRegen(false);
                        setRegenPassword("");
                      }}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl">{t.devices}</h2>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {overview.devices.length === 0 ? (
            <li className="py-4 text-sm text-muted-foreground">
              {t.noDevices}
            </li>
          ) : (
            overview.devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {device.deviceLabel || t.browserSession}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {device.ip || "—"} · {formatDateTime(device.lastActiveAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t.revoked}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await revokeDeviceSession(device.id);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(t.revoked);
                      refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="font-display text-2xl">{t.loginHistory}</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {overview.logins.length === 0 ? (
            <li className="py-4 text-muted-foreground">{t.noLogins}</li>
          ) : (
            overview.logins.map((login) => (
              <li key={login.id} className="flex justify-between gap-3 py-2">
                <span>
                  {login.success ? t.success : t.failed}
                  {login.reason ? ` · ${login.reason}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {login.ip || "—"} · {formatDateTime(login.createdAt)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
