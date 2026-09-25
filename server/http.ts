import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser, type SafeUser } from "@/lib/auth";
import { ConflictError, NotFoundError } from "@/server/catalogue";
import { BookingError } from "@/server/bookings";
import { PricingError } from "@/server/pricing";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import type { Actor } from "@/server/catalogue";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        code: "validation_error",
        message: "Please check the highlighted fields.",
        details: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ code: "unauthorized", message: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ code: "forbidden", message: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ code: "not_found", message: error.message }, { status: 404 });
  }
  if (error instanceof PricingError || error instanceof BookingError) {
    return NextResponse.json({ code: "pricing_error", message: error.message }, { status: 422 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ code: "not_found", message: "Record not found." }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json({ code: "conflict", message: error.message }, { status: 409 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { code: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }
  console.error("Unhandled API error", error);
  return NextResponse.json(
    { code: "internal_error", message: "Something went wrong." },
    { status: 500 },
  );
}

/** Resolve the request actor (null when anonymous). Services enforce 401/403. */
export async function requestActor(): Promise<Actor | null> {
  const user: SafeUser | null = await currentUser();
  return user ? { id: user.id, role: user.role } : null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("Request body must be JSON");
  }
}
