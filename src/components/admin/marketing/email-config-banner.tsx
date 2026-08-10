import { AlertTriangle } from "lucide-react";

type EmailConfigStatus = {
  configured: boolean;
  from: string;
  missing: string[];
};

export function EmailConfigBanner({ status }: { status: EmailConfigStatus }) {
  if (status.configured) return null;

  return (
    <div
      role="alert"
      className="flex gap-3 border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium text-foreground">Email delivery not configured</p>
        <p className="mt-1 text-muted-foreground">
          Set {status.missing.join(", ")} in your environment to send campaigns and
          reminders. Sends are disabled until Resend is configured — no emails will be
          faked as sent.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">From address: {status.from}</p>
      </div>
    </div>
  );
}
