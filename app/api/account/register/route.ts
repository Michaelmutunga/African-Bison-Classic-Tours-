import { NextResponse } from "next/server";
import { clientIp, throttled } from "@/lib/ratelimit";
import { createSession, sessionCookieHeader, toSafeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerCustomer } from "@/server/portal";
import { errorResponse, readJson } from "@/server/http";

/** Customer self-registration. Claims guest bookings on the same email. */
export async function POST(request: Request) {
  try {
    if (throttled(`register:${clientIp(request)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const { user, claimedCount } = await registerCustomer(await readJson(request));
    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json(
      { ok: true, user: toSafeUser(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })), claimedCount },
      { status: 201 },
    );
    response.headers.set("Set-Cookie", sessionCookieHeader(token, expiresAt));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
