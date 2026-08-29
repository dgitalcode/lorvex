import type { PermissionKey } from "@/server/auth/permissions";
import { assertPermission, type AdminSessionUser } from "@/server/auth/require-admin";
import { rejectCrossOrigin } from "@/lib/request-origin";

export function methodNotAllowedGet() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function authorizeAdminSensitivePost(
  request: Request,
  permission: PermissionKey,
): Promise<{ ok: true; user: AdminSessionUser } | { ok: false; response: Response }> {
  try {
    const user = await assertPermission(permission);
    const cross = rejectCrossOrigin(request);
    if (cross) return { ok: false, response: cross };
    return { ok: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    return {
      ok: false,
      response: new Response(message === "FORBIDDEN" ? "Forbidden" : "Unauthorized", {
        status: message === "FORBIDDEN" ? 403 : 401,
      }),
    };
  }
}
