import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { previewSegment } from "@/lib/reactivate/jobs/evaluateSegments";

/**
 * GET /api/reactivate/segments/[id]/preview
 * Preview which contacts would match the segment's filters.
 * Returns count, sample contacts, and how many were evaluated.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId } = await params;

  try {
    const result = await previewSegment(segmentId, accountId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
