import { NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { PRESET_METADATA, PRESET_IDS } from "@/lib/reactivate/templates/presets";

/**
 * GET /api/reactivate/preset-templates
 * List predefined high-converting templates for customers to choose from.
 */
export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presets = PRESET_IDS.map((id) => ({
    id,
    ...PRESET_METADATA[id],
  }));

  return NextResponse.json({ presets });
}
