import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, clearedSessionCookieHeader, destroySession } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearedSessionCookieHeader());
  return response;
}
