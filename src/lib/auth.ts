import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit } from "@/server/services/security";
import { verifyTwoFactorToken } from "@/server/services/two-factor";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  otp: z.string().min(6).max(64).optional(),
});

/** Signaled to the client when password is valid but 2FA is required. */
export class TwoFactorRequiredError extends CredentialsSignin {
  code = "2FA_REQUIRED";
}

export class RateLimitedError extends CredentialsSignin {
  code = "RATE_LIMITED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.pwdv =
          (user as { passwordChangedAt?: Date | null }).passwordChangedAt?.getTime() ??
          0;
        token.lastPwdCheck = Date.now();
        return token;
      }

      if (!token.id) return token;

      const lastCheck = typeof token.lastPwdCheck === "number" ? token.lastPwdCheck : 0;
      // Re-validate password version periodically so resets invalidate JWTs.
      if (Date.now() - lastCheck > 30_000) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { passwordChangedAt: true, status: true },
          });
          token.lastPwdCheck = Date.now();
          if (!dbUser || dbUser.status !== "ACTIVE") {
            return {};
          }
          const changed = dbUser.passwordChangedAt?.getTime() ?? 0;
          const stamped = typeof token.pwdv === "number" ? token.pwdv : 0;
          if (changed > stamped) {
            return {};
          }
        } catch {
          // Keep existing token on transient DB errors
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      try {
        const { recordLoginAttempt } = await import(
          "@/server/services/security"
        );
        await recordLoginAttempt({
          userId: user.id,
          success: true,
          reason: "CREDENTIALS",
        });
      } catch {
        // non-blocking
      }
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse({
          email: raw?.email,
          password: raw?.password,
          otp:
            typeof raw?.otp === "string" && raw.otp.trim()
              ? raw.otp.trim()
              : undefined,
        });
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();

        const limit = await checkRateLimit({
          key: `auth:login:${email}`,
          limit: 12,
          windowMs: 15 * 60_000,
        });
        if (!limit.allowed) {
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { twoFactor: true },
        });

        if (!user?.passwordHash || user.status !== "ACTIVE") return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          try {
            const { recordLoginAttempt } = await import(
              "@/server/services/security"
            );
            await recordLoginAttempt({
              userId: user.id,
              success: false,
              reason: "INVALID_PASSWORD",
            });
          } catch {
            // non-blocking
          }
          return null;
        }

        if (user.twoFactor?.enabled) {
          const otp = parsed.data.otp;
          if (!otp) {
            throw new TwoFactorRequiredError();
          }

          const otpLimit = await checkRateLimit({
            key: `auth:2fa:${email}`,
            limit: 8,
            windowMs: 15 * 60_000,
          });
          if (!otpLimit.allowed) {
            throw new RateLimitedError();
          }

          const verified = await verifyTwoFactorToken({
            userId: user.id,
            secret: user.twoFactor.secret,
            token: otp,
          });

          if (!verified.ok) {
            try {
              const { recordLoginAttempt } = await import(
                "@/server/services/security"
              );
              await recordLoginAttempt({
                userId: user.id,
                success: false,
                reason: "INVALID_2FA",
              });
            } catch {
              // non-blocking
            }
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name:
            user.name ??
            `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          image: user.image,
          role: user.role,
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
});
