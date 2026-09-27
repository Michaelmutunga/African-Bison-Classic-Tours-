import { NextResponse } from "next/server";
import { createVehicle, listVehicles } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return NextResponse.json({ ok: true, vehicles: await listVehicles(await requestActor(), status) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const vehicle = await createVehicle(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, vehicle }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
