import type { Role } from "@prisma/client";

export const JWT_PWD_CHECK_INTERVAL_MS = 30_000;

export type JwtSessionToken = {
  id?: string;
  role?: string;
  pwdv?: number;
  lastPwdCheck?: number;
};

export type JwtRefreshUser = {
  passwordChangedAt: Date | null;
  status: string;
  role: Role | string;
};

/**
 * Apply password-version, status, and role checks used by the Auth.js jwt callback.
 * Returns an empty object to invalidate the session.
 */
export function applyJwtRefresh(
  token: JwtSessionToken,
  dbUser: JwtRefreshUser | null,
  now = Date.now(),
): JwtSessionToken | Record<string, never> {
  if (!dbUser || dbUser.status !== "ACTIVE") {
    return {};
  }
  const changed = dbUser.passwordChangedAt?.getTime() ?? 0;
  const stamped = typeof token.pwdv === "number" ? token.pwdv : 0;
  if (changed > stamped) {
    return {};
  }
  return {
    ...token,
    role: dbUser.role,
    lastPwdCheck: now,
  };
}

export function shouldRefreshJwt(token: JwtSessionToken, now = Date.now()) {
  const lastCheck = typeof token.lastPwdCheck === "number" ? token.lastPwdCheck : 0;
  return now - lastCheck > JWT_PWD_CHECK_INTERVAL_MS;
}
