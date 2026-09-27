import { NextResponse } from "next/server";
import type { PublishStatus } from "@prisma/client";
import { createPost, listPosts } from "@/server/content-admin";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status") as PublishStatus | null;
    const posts = await listPosts(await requestActor(), status ?? undefined);
    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const post = await createPost(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, post }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
