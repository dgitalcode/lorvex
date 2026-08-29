/**
 * Browser same-origin check for sensitive admin mutations.
 * Authorization (session + permission) remains the primary control.
 */
export function isSameOriginRequest(request: Request): boolean {
  let expectedHost: string;
  try {
    expectedHost = new URL(request.url).host;
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === expectedHost;
    } catch {
      return false;
    }
  }

  // Non-browser clients (no Origin/Referer). Cookie CSRF relies on SameSite=Lax
  // for POST; this helper still allows scripts that already passed auth.
  return true;
}

export function rejectCrossOrigin(request: Request): Response | null {
  if (isSameOriginRequest(request)) return null;
  return new Response("Forbidden", { status: 403 });
}
