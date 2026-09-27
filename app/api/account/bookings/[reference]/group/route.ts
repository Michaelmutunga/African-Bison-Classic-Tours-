import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createGroup, groupDashboard } from "@/server/groups";
import { errorResponse, readJson } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const dashboard = await groupDashboard(await currentUser(), reference);
    return NextResponse.json({ ok: true, ...dashboard });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const group = await createGroup(await currentUser(), reference, await readJson(request));
    return NextResponse.json({ ok: true, group }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
