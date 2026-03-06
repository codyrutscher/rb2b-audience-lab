/**
 * POST /api/reactivate/test/load-sample
 * Upload resolutions-sample.csv (or similar) to simulate pixel ingest.
 * Requires auth. Uses first pixel for account, or pixel_id in form.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { ingestPixelData } from "@/lib/reactivate/jobs/ingestPixelData";
import { parseResolutionsCsv } from "@/lib/reactivate/csvToPixelEvents";

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data with 'file' (CSV)" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' - upload a resolutions CSV (tab-separated)" },
      { status: 400 }
    );
  }

  const pixelIdParam = formData.get("pixel_id")?.toString().trim();

  const pixel = pixelIdParam
    ? await prisma.rtPixel.findFirst({
        where: { id: pixelIdParam, accountId },
        select: { id: true, accountId: true, audiencelabPixelId: true },
      })
    : await prisma.rtPixel.findFirst({
        where: { accountId },
        select: { id: true, accountId: true, audiencelabPixelId: true },
      });

  if (!pixel) {
    return NextResponse.json(
      { error: "No pixel found. Create a pixel in Install first." },
      { status: 400 }
    );
  }

  const audiencelabPixelId = pixel.audiencelabPixelId ?? "sample";
  const csvText = await file.text();

  let events;
  try {
    events = parseResolutionsCsv(csvText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Invalid CSV: ${msg}` }, { status: 400 });
  }

  if (events.length === 0) {
    return NextResponse.json(
      { error: "No valid events (rows with email) in CSV" },
      { status: 400 }
    );
  }

  const result = await ingestPixelData(
    pixel.id,
    audiencelabPixelId,
    pixel.accountId,
    events
  );

  return NextResponse.json({
    ok: true,
    contactsUpserted: result.contactsUpserted,
    eventsInserted: result.eventsInserted,
    eventsSkipped: result.eventsSkipped,
    contactsEnqueued: result.contactsEnqueued,
    pixelId: pixel.id,
  });
}
