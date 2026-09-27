import { NextResponse } from "next/server";
import { deleteVehicle, updateVehicle } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const vehicle = await updateVehicle(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, vehicle });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteVehicle(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
