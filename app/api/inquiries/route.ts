import { NextResponse } from "next/server";
import { inquiryReference, inquirySchema } from "@/lib/inquiries";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const parsed = inquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "validation_error",
        message: "Please check the highlighted fields.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;
  if (data.company) {
    // Honeypot filled: pretend success so bots learn nothing.
    return NextResponse.json({ ok: true, reference: inquiryReference() }, { status: 201 });
  }

  const reference = inquiryReference();
  const inquiry = await prisma.contactInquiry.create({
    data: {
      reference,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      country: data.country || null,
      destination: data.destination || null,
      travelDates: data.travelDates || null,
      travellers: data.travellers || null,
      tourSlug: data.tourSlug || null,
      message: data.message,
      preferredContact: data.preferredContact ?? null,
    },
    select: { reference: true },
  });

  return NextResponse.json({ ok: true, reference: inquiry.reference }, { status: 201 });
}
