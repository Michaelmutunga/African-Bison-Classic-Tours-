import { NextResponse } from "next/server";
import { createSupplierLock, listSupplierLocks, suggestSuppliers } from "@/server/suppliers";
import type { SupplierLockStatus } from "@prisma/client";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // ?suggest=1&serviceType=&location=&startsAt=&endsAt=&quantity=
    if (url.searchParams.get("suggest") === "1") {
      const suggestions = await suggestSuppliers(await requestActor(), {
        serviceType: url.searchParams.get("serviceType"),
        location: url.searchParams.get("location"),
        startsAt: url.searchParams.get("startsAt"),
        endsAt: url.searchParams.get("endsAt"),
        quantity: url.searchParams.get("quantity") ? Number(url.searchParams.get("quantity")) : 1,
      });
      return NextResponse.json({ ok: true, suggestions });
    }
    const locks = await listSupplierLocks(await requestActor(), {
      supplierId: url.searchParams.get("supplierId") ?? undefined,
      status: (url.searchParams.get("status") as SupplierLockStatus | null) ?? undefined,
      bookingRef: url.searchParams.get("bookingRef") ?? undefined,
    });
    return NextResponse.json({ ok: true, locks });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const lock = await createSupplierLock(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, lock }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
