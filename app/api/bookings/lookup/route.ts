import { NextResponse } from "next/server";
import { z } from "zod";
import { getBookingByReference } from "@/server/bookings";
import { errorResponse } from "@/server/http";

const querySchema = z.object({
  reference: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(254),
});

/** Public lookup: reference + booking email must match. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { reference, email } = querySchema.parse({
      reference: url.searchParams.get("reference"),
      email: url.searchParams.get("email"),
    });
    const booking = await getBookingByReference(reference.toUpperCase(), email);
    if (!booking) {
      return NextResponse.json(
        { code: "not_found", message: "No booking matches that reference and email." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}
