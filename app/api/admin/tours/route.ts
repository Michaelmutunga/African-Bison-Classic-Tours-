import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { UnauthorizedError } from "@/lib/permissions";
import { createTour, listTours } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const actor = await requestActor();
    // Admin listing includes unpublished tours: requires catalogue.write.
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) {
      throw new ForbiddenError("catalogue.write");
    }
    const tours = await listTours({
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      publishedOnly: url.searchParams.get("published") !== "all",
      search: url.searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ ok: true, tours });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requestActor();
    const tour = await createTour(actor, await readJson(request));
    return NextResponse.json({ ok: true, tour }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
