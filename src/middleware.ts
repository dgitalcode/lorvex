import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRouteAuthorized } from "@/lib/auth-redirect";

function storefrontLocale(pathname: string): "fr" | "en" | "ar" | null {
  const segment = pathname.split("/")[1];
  if (segment === "fr" || segment === "en" || segment === "ar") return segment;
  return null;
}

function withLocaleHeaders(request: NextRequest) {
  const locale = storefrontLocale(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  if (locale) {
    requestHeaders.set("x-lorvex-locale", locale);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return withLocaleHeaders(request);
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    const signInUrl = new URL("/fr/auth/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!isAdminRouteAuthorized({ user: { role: token.role as string } })) {
    return NextResponse.redirect(new URL("/fr/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/(fr|en|ar)",
    "/(fr|en|ar)/:path*",
  ],
};
