import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { isAdminRouteAuthorized } from "@/lib/auth-redirect";

const { auth } = NextAuth(authConfig);

function storefrontLocale(pathname: string): "fr" | "en" | "ar" | null {
  const segment = pathname.split("/")[1];
  if (segment === "fr" || segment === "en" || segment === "ar") return segment;
  return null;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const locale = storefrontLocale(pathname);
  const requestHeaders = new Headers(request.headers);
  if (locale) {
    requestHeaders.set("x-lorvex-locale", locale);
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!request.auth?.user) {
    const signInUrl = new URL("/fr/auth/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated customers must not enter the admin surface.
  if (!isAdminRouteAuthorized(request.auth)) {
    return NextResponse.redirect(new URL("/fr/account", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/(fr|en|ar)",
    "/(fr|en|ar)/:path*",
  ],
};
