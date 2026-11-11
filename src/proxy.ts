import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/assessment");
  const hasExpressSession = Boolean(
    request.cookies.get("trimmer_access_token")?.value,
  );

  const isPageNavigation =
    (request.method === "GET" || request.method === "HEAD") &&
    !request.headers.has("next-action");

  if (isProtected && isPageNavigation && !request.auth && !hasExpressSession) {
    const signInUrl = new URL("/", request.nextUrl.origin);
    signInUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/assessment/:path*"],
};
