import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { enqueue } from "@/lib/reactivate/queue";
import { JOB_NAMES } from "@/lib/reactivate/queue";

const envKey = process.env.AUDIENCELAB_API_KEY?.trim();

/**
 * POST /api/reactivate/pixels/fetch-all
 * Enqueue FetchPixelDataJob for every pixel that can fetch.
 */
export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pixels = await prisma.rtPixel.findMany({
    where: {
      accountId,
      audiencelabPixelId: { not: null },
      OR: [{ audiencelabApiKey: { not: null } }, { audiencelabApiKey: null }],
    },
    select: {
      id: true,
      name: true,
      audiencelabPixelId: true,
      audiencelabApiKey: true,
    },
  });

  const fetchable = pixels.filter(
    (p) => p.audiencelabPixelId && (p.audiencelabApiKey?.trim() || envKey)
  );

  const jobs: { pixelId: string; pixelName: string; jobId: string }[] = [];
  for (const p of fetchable) {
    const jobId = await enqueue(JOB_NAMES.FetchPixelData, { pixel_id: p.id });
    jobs.push({ pixelId: p.id, pixelName: p.name ?? "Pixel", jobId });
  }

  return NextResponse.json(
    {
      message: `${jobs.length} fetch job(s) enqueued. Worker will process shortly.`,
      jobs,
    },
    { status: 202 }
  );
}
