import { NextResponse } from "next/server";
import { z } from "zod";
import type { PublishStatus } from "@prisma/client";
import { deletePost, setPostStatus, updatePost } from "@/server/content-admin";
import { errorResponse, readJson, requestActor } from "@/server/http";

const statusSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  scheduledFor: z.string().datetime().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requestActor();
    const body = (await readJson(request)) as Record<string, unknown>;
    if (typeof body.status === "string") {
      const { status, scheduledFor } = statusSchema.parse(body);
      const post = await setPostStatus(actor, id, status as PublishStatus, scheduledFor);
      return NextResponse.json({ ok: true, post });
    }
    const post = await updatePost(actor, id, body);
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deletePost(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
