import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const actor = await requestActor();
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    return NextResponse.json({ ok: true, categories: await listCategories() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const category = await createCategory(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
