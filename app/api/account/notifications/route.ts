import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMyNotifications } from "@/server/notifications/dispatch";
import { errorResponse } from "@/server/http";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { code: "unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }
    const notifications = await listMyNotifications(user.id, [user.email]);
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return errorResponse(error);
  }
}
