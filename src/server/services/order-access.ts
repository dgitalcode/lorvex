import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/server/auth/permissions";
import { checkRateLimit, hashToken } from "@/server/services/security";

/** 256-bit unguessable capability token. Order number is not a secret. */
export function generateOrderAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOrderAccessToken(raw: string) {
  return hashToken(raw.trim());
}

export function tokensMatch(presented: string, storedHash: string) {
  const presentedHash = hashOrderAccessToken(presented);
  try {
    const a = Buffer.from(presentedHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type OrderAccessSession = {
  user?: { id?: string | null; role?: string | null } | null;
} | null;

/**
 * Guest access requires the high-entropy token.
 * Authenticated owners and staff may omit the token.
 * Deny (caller should 404) must not distinguish unknown vs unauthorized orders.
 */
export function decideOrderAccess(input: {
  orderFound: boolean;
  accessTokenHash: string | null;
  presentedToken: string | null | undefined;
  session: OrderAccessSession;
  orderUserId: string | null;
}): "allow" | "deny" {
  if (!input.orderFound) return "deny";

  if (isStaffRole(input.session?.user?.role)) return "allow";

  const sessionUserId = input.session?.user?.id;
  if (sessionUserId && input.orderUserId && sessionUserId === input.orderUserId) {
    return "allow";
  }

  const presented = input.presentedToken?.trim() ?? "";
  if (presented.length < 32 || presented.length > 128) return "deny";
  if (!input.accessTokenHash) return "deny";
  return tokensMatch(presented, input.accessTokenHash) ? "allow" : "deny";
}

export const ORDER_LOOKUP_RATE = {
  limit: 40,
  windowMs: 15 * 60_000,
} as const;

const orderInclude = {
  items: true,
  shippingAddress: true,
  shippingMethod: true,
} as const;

export async function findAuthorizedStorefrontOrder(input: {
  number: string;
  presentedToken: string | null | undefined;
  session: OrderAccessSession;
  ip: string;
}) {
  const limited = await checkRateLimit({
    key: `order-lookup:${input.ip}`,
    limit: ORDER_LOOKUP_RATE.limit,
    windowMs: ORDER_LOOKUP_RATE.windowMs,
  });
  if (!limited.allowed) {
    return { status: "rate_limited" as const, order: null };
  }

  const order = await prisma.order.findUnique({
    where: { number: input.number },
    include: orderInclude,
  });

  const decision = decideOrderAccess({
    orderFound: Boolean(order),
    accessTokenHash: order?.accessTokenHash ?? null,
    presentedToken: input.presentedToken,
    session: input.session,
    orderUserId: order?.userId ?? null,
  });

  if (decision !== "allow" || !order) {
    return { status: "deny" as const, order: null };
  }
  return { status: "allow" as const, order };
}
