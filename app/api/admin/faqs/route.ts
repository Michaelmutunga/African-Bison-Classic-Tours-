import { NextResponse } from "next/server";
import { createFaq, listFaqs } from "@/server/content-admin";
import { errorResponse, readJson, requestActor } from "@/server/http";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    return NextResponse.json({ ok: true, faqs: await listFaqs(false) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const faq = await createFaq(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, faq }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
