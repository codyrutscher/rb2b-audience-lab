import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { listPixels } from "@/lib/reactivate/pixelApi";

/**
 * POST /api/reactivate/pixels/:id/refresh-install-url
 * Fetches install_url from Audiencelab and updates the pixel (for existing pixels that don't have it).
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
    select: { id: true, audiencelabPixelId: true, audiencelabApiKey: true },
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  if (!pixel.audiencelabPixelId) {
    return NextResponse.json(
      { error: "Pixel was not created via Audiencelab API; no install URL available" },
      { status: 400 }
    );
  }

  const apiKey = pixel.audiencelabApiKey?.trim() || process.env.AUDIENCELAB_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key (set per-pixel or AUDIENCELAB_API_KEY env)" },
      { status: 400 }
    );
  }

  try {
    const { data } = await listPixels(apiKey);
    const match = (data || []).find(
      (p) => p.id === pixel.audiencelabPixelId
    );
    if (!match?.install_url) {
      return NextResponse.json(
        { error: "Install URL not found in Audiencelab response" },
        { status: 404 }
      );
    }

    await prisma.rtPixel.update({
      where: { id: pixelId },
      data: { audiencelabInstallUrl: match.install_url },
    });

    return NextResponse.json({
      installUrl: match.install_url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to fetch install URL: ${msg}` },
      { status: 502 }
    );
  }
}
