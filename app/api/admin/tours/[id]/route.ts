import { NextResponse } from "next/server";
import { deleteTour, setTourPublished, updateTour } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requestActor();
    const body = (await readJson(request)) as { published?: unknown } & Record<string, unknown>;
    const tour =
      typeof body.published === "boolean" && Object.keys(body).length === 1
        ? await setTourPublished(actor, id, body.published)
        : await updateTour(actor, id, body);
    return NextResponse.json({ ok: true, tour });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTour(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Explicit publish endpoint: POST /api/admin/tours/:id { published: true }
  try {
    const { id } = await params;
    const { published } = z.object({ published: z.boolean() }).parse(await readJson(request));
    const tour = await setTourPublished(await requestActor(), id, published);
    return NextResponse.json({ ok: true, tour });
  } catch (error) {
    return errorResponse(error);
  }
}
