import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import {
  PRESET_IDS,
  PRESET_PREVIEW_HTML,
} from "@/lib/reactivate/templates/preset-previews.generated";

export const dynamic = "force-dynamic";

/**
 * GET /api/reactivate/preset-templates/:id/preview
 * Returns pre-compiled HTML for the preset (no mjml/fs at build time).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!PRESET_IDS.includes(id as (typeof PRESET_IDS)[number])) {
    return NextResponse.json({ error: "Invalid preset id" }, { status: 400 });
  }

  const html = PRESET_PREVIEW_HTML[id];
  if (!html) {
    return NextResponse.json({ error: "Preview not found" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
