import { NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { PIXEL_FIELDS, OPERATORS } from "@/lib/reactivate/pixelFields";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ fields: PIXEL_FIELDS, operators: OPERATORS });
}
