import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route fence for /admin (Phase 3). This is a UX redirect only —
 * authorization is enforced server-side in every admin API route and
 * server action via lib/auth + lib/permissions.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const session = request.cookies.get("bison_session")?.value;
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
