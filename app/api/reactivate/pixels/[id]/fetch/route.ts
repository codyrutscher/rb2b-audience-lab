import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { enqueue } from "@/lib/reactivate/queue";
import { JOB_NAMES } from "@/lib/reactivate/queue";

/**
 * POST /api/reactivate/pixels/[id]/fetch
 * Enqueue FetchPixelDataJob to fetch and ingest pixel data.
 */
export async function POST(
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
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  if (!pixel.audiencelabPixelId || !pixel.audiencelabApiKey) {
    return NextResponse.json(
      { error: "Pixel must have audiencelab_pixel_id and API key. Create pixel via Audiencelab API first." },
      { status: 400 }
    );
  }

  const jobId = await enqueue(JOB_NAMES.FetchPixelData, { pixel_id: pixelId });
  return NextResponse.json({ job_id: jobId, message: "Fetch job enqueued. Worker will process shortly." }, { status: 202 });
}
