import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, throttled } from "@/lib/ratelimit";
import {
  clearedSessionCookieHeader,
  createSession,
  sessionCookieHeader,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (throttled(`login:${ip}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const body = loginSchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    const valid = user && user.isActive && (await verifyPassword(body.password, user.passwordHash));
    if (!valid) {
      // No user enumeration: identical response for unknown email.
      // Randomised timing is intentionally not added (constant-time
      // compare of hashes is meaningless across distinct users).
      return NextResponse.json(
        { code: "invalid_credentials", message: "Email or password is incorrect." },
        { status: 401 },
      );
    }
    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ ok: true, user: toSafeUser(user) });
    response.headers.set("Set-Cookie", sessionCookieHeader(token, expiresAt));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearedSessionCookieHeader());
  return response;
}
