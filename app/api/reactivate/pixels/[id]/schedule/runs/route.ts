import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

/**
 * GET /api/reactivate/pixels/[id]/schedule/runs
 * Run history for this pixel's schedule.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: pixelId } = await params;
  const pixel = await prisma.rtPixel.findFirst({
    where: { id: pixelId, accountId },
    include: { schedule: { include: { runs: { orderBy: { startedAt: "desc" }, take: 50 } } } },
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  const schedule = pixel.schedule;
  if (!schedule) {
    return NextResponse.json({ runs: [], schedule: null });
  }
  return NextResponse.json({
    schedule: {
      id: schedule.id,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      enabled: schedule.enabled,
      intervalType: schedule.intervalType,
      intervalValue: schedule.intervalValue,
    },
    runs: schedule.runs,
  });
}
