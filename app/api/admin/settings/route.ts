import { NextResponse } from "next/server";
import { z } from "zod";
import { listSettings, setSetting } from "@/server/content-admin";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, settings: await listSettings(await requestActor()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = z
      .object({ key: z.string(), value: z.string() })
      .parse(await readJson(request));
    const setting = await setSetting(await requestActor(), key, value);
    return NextResponse.json({ ok: true, setting });
  } catch (error) {
    return errorResponse(error);
  }
}
