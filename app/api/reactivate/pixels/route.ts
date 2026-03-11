import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { createPixel as createPixelApi } from "@/lib/reactivate/pixelApi";

/**
 * GET /api/reactivate/pixels
 * List all pixels for the account.
 */
export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pixels = await prisma.rtPixel.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      websiteName: true,
      websiteUrl: true,
      webhookUrl: true,
      audiencelabPixelId: true,
      audiencelabInstallUrl: true,
      createdAt: true,
      audiencelabApiKey: true, // used only to derive canFetch; not sent to client
      schedule: {
        select: {
          id: true,
          intervalType: true,
          intervalValue: true,
          enabled: true,
          lastRunAt: true,
          nextRunAt: true,
        },
      },
    },
  });
  const envKey = process.env.AUDIENCELAB_API_KEY?.trim();
  const sanitized = pixels.map(({ audiencelabApiKey, audiencelabPixelId, audiencelabInstallUrl, schedule, ...p }) => ({
    ...p,
    audiencelabPixelId,
    audiencelabInstallUrl,
    audiencelabApiKey: null,
    canFetch: !!audiencelabPixelId && (!!audiencelabApiKey?.trim() || !!envKey),
    schedule: schedule ?? null,
  }));
  return NextResponse.json({ pixels: sanitized });
}

/**
 * POST /api/reactivate/pixels
 * Create a pixel (optionally via Audiencelab API) and store it.
 * Body: { name, website_name, website_url, webhook_url?, audiencelab_api_key? }
 * If audiencelab_api_key is provided, calls Audiencelab API to create pixel and stores returned id.
 */
export async function POST(request: NextRequest) {
  try {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name, website_name, website_url, webhook_url, audiencelab_api_key } = body;

  if (!name?.trim() || !website_name?.trim() || !website_url?.trim()) {
    return NextResponse.json(
      { error: "name, website_name, and website_url are required" },
      { status: 400 }
    );
  }

  let audiencelabPixelId: string | null = null;
  let audiencelabInstallUrl: string | null = null;
  let apiKeyToStore: string | null = null;
  
  // Only use Audiencelab if an API key is explicitly provided
  const apiKey = audiencelab_api_key?.trim();

  if (apiKey) {
    try {
      const created = await createPixelApi(
        apiKey,
        {
          websiteName: website_name.trim(),
          websiteUrl: website_url.trim(),
          webhookUrl: webhook_url?.trim() || undefined,
          version: "v4",
        }
      );
      audiencelabPixelId = created.id ?? created.pixel_id ?? null;
      audiencelabInstallUrl = (created.install_url as string) || null;
      apiKeyToStore = apiKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[POST /api/reactivate/pixels] Audiencelab API error:", msg);
      return NextResponse.json(
        { error: `Failed to create pixel in Audiencelab: ${msg}` },
        { status: 502 }
      );
    }
  }

  const createData = {
    accountId,
    name: name.trim(),
    websiteName: website_name.trim(),
    websiteUrl: website_url.trim(),
    webhookUrl: webhook_url?.trim() || null,
    version: "v4",
    audiencelabPixelId,
    audiencelabInstallUrl,
    audiencelabApiKey: apiKeyToStore,
  };

  try {
    const pixel = await prisma.rtPixel.create({ data: createData });
    return NextResponse.json({ pixel }, { status: 201 });
  } catch (dbErr) {
    console.error("[POST /api/reactivate/pixels] DB error:", dbErr);
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    // If Prisma client stale or column missing, retry without audiencelabInstallUrl
    if (
      msg.includes("audiencelab_install_url") ||
      msg.includes("audiencelabInstallUrl") ||
      msg.includes("Unknown column") ||
      msg.includes("Unknown argument")
    ) {
      try {
        const pixel = await prisma.rtPixel.create({
          data: {
            accountId,
            name: name.trim(),
            websiteName: website_name.trim(),
            websiteUrl: website_url.trim(),
            webhookUrl: webhook_url?.trim() || null,
            version: "v4",
            audiencelabPixelId,
            audiencelabApiKey: apiKeyToStore,
          },
        });
        return NextResponse.json({ pixel }, { status: 201 });
      } catch (retryErr) {
        console.error("[POST /api/reactivate/pixels] Retry error:", retryErr);
      }
    }
    return NextResponse.json(
      { error: `Database error: ${msg}. Run migration 016 if audiencelab_install_url is missing.` },
      { status: 500 }
    );
  }
  } catch (err) {
    console.error("[POST /api/reactivate/pixels] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
