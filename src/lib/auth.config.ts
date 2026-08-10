import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / Node-only imports).
 * Credentials provider is attached in `src/lib/auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/fr/auth/sign-in",
    error: "/fr/auth/sign-in",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (!path.startsWith("/admin")) return true;
      const role = auth?.user?.role;
      return (
        role === "SUPER_ADMIN" ||
        role === "ADMIN" ||
        role === "EDITOR" ||
        role === "SUPPORT" ||
        role === "ANALYST"
      );
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
