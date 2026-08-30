/**
 * Auth.js sets `__Secure-authjs.session-token` on HTTPS.
 * On Vercel, middleware `request.url` is often `http://` even when the
 * public site is HTTPS. `getToken()` then looks up the non-secure cookie
 * name, finds nothing, and `/admin` redirects to sign-in while `auth()`
 * on the sign-in page still sees the session — an infinite navigation loop.
 */
export function shouldUseSecureAuthCookie(headers: Headers): boolean {
  const forwarded = headers.get("x-forwarded-proto");
  if (forwarded) {
    const proto = forwarded.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
  }
  return process.env.NODE_ENV === "production";
}
