import { NextResponse } from "next/server";
import { z } from "zod";
import { unassignGuide, unassignVehicle } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? (await readJson(request).catch(() => ({})) as { kind?: string }).kind;
    const parsed = z.enum(["vehicle", "guide"]).parse(kind);
    if (parsed === "vehicle") await unassignVehicle(await requestActor(), id);
    else await unassignGuide(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
