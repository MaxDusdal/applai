import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/applications",
  "/profile",
  "/settings",
  "/templates",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  // NOTE: This middleware provides a UX-level guard only (redirects users without a session cookie).
  // Real authorization is enforced in server components and tRPC procedures via auth.api.getSession().
  const sessionToken = request.cookies.get("better-auth.session_token");
  if (!sessionToken) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/templates/:path*",
  ],
};
