import { NextResponse } from "next/server";
import { createAddOn, listAddOns } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const actor = await requestActor();
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    return NextResponse.json({ ok: true, addOns: await listAddOns(false) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const addOn = await createAddOn(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, addOn }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
