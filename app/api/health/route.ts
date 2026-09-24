import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let database: "connected" | "unconfigured" | "unreachable" = "unconfigured";

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch {
      database = "unreachable";
    }
  }

  const status = database === "unreachable" ? 503 : 200;
  return NextResponse.json(
    { status: status === 200 ? "ok" : "degraded", database, time: new Date().toISOString() },
    { status },
  );
}
