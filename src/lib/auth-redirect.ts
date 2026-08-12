import { isStaffRole } from "@/server/auth/permissions";

/**
 * Reject open redirects. Only same-app relative paths are accepted.
 */
export function sanitizeCallbackUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("://")) return null;
  if (value.includes("\\")) return null;
  return value;
}

export function defaultPostLoginPath(role: string | null | undefined, locale: string): string {
  const safeLocale = locale === "en" || locale === "ar" || locale === "fr" ? locale : "fr";
  return isStaffRole(role) ? "/admin" : `/${safeLocale}/account`;
}

/**
 * Role-aware destination after successful authentication.
 * Staff → /admin (or a safe /admin callback). Customers → /{locale}/account
 * (or a safe non-admin callback). Never sends customers to /admin.
 */
export function resolvePostLoginPath(input: {
  role?: string | null;
  locale: string;
  callbackUrl?: string | null;
}): string {
  const fallback = defaultPostLoginPath(input.role, input.locale);
  const callback = sanitizeCallbackUrl(input.callbackUrl);
  if (!callback) return fallback;

  if (callback === "/admin" || callback.startsWith("/admin/")) {
    return isStaffRole(input.role) ? callback : fallback;
  }

  return callback;
}

/** Edge-safe admin gate used by middleware / auth config tests. */
export function isAdminRouteAuthorized(
  session: { user?: { role?: string | null } | null } | null | undefined,
): boolean {
  return isStaffRole(session?.user?.role);
}
