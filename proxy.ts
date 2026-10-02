import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route fences (UX redirects only — authorization is enforced server-side
 * in every API route and page via lib/auth + lib/permissions).
 */
const PORTAL_PREFIXES = ["/dashboard", "/my-safaris", "/safari", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPortal = PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if ((isAdmin || isPortal) && !request.cookies.get("bison_session")?.value) {
    // Separate entry points: staff deep-links land on the staff portal,
    // customer deep-links land on the customer portal.
    const login = new URL(isAdmin ? "/staff/login" : "/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/my-safaris",
    "/my-safaris/:path*",
    "/safari",
    "/safari/:path*",
    "/profile",
    "/profile/:path*",
  ],
};
