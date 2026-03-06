/**
 * POST /api/reactivate/test/seed-sample
 * Seeds 10-20 test records from resolutions-sample.csv into the current account.
 * Query: ?count=20 (default 20)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { ingestPixelData } from "@/lib/reactivate/jobs/ingestPixelData";
import { parseResolutionsCsv } from "@/lib/reactivate/csvToPixelEvents";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SAMPLE_FILE = "resolutions-sample.csv";

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countParam = searchParams.get("count");
  const count = Math.min(100, Math.max(10, parseInt(countParam || "20", 10) || 20));

  const pixel = await prisma.rtPixel.findFirst({
    where: { accountId },
    select: { id: true, accountId: true, audiencelabPixelId: true },
  });

  if (!pixel) {
    return NextResponse.json(
      { error: "No pixel found. Create a pixel in Install first." },
      { status: 400 }
    );
  }

  let csvText: string;
  try {
    const filePath = join(process.cwd(), SAMPLE_FILE);
    csvText = await readFile(filePath, "utf-8");
  } catch (e) {
    return NextResponse.json(
      { error: `${SAMPLE_FILE} not found in project root` },
      { status: 404 }
    );
  }

  let events;
  try {
    events = parseResolutionsCsv(csvText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Invalid CSV: ${msg}` }, { status: 400 });
  }

  const limited = events.slice(0, count);
  if (limited.length === 0) {
    return NextResponse.json(
      { error: "No valid events (rows with email) in CSV" },
      { status: 400 }
    );
  }

  const audiencelabPixelId = pixel.audiencelabPixelId ?? "sample";
  const result = await ingestPixelData(
    pixel.id,
    audiencelabPixelId,
    pixel.accountId,
    limited
  );

  return NextResponse.json({
    ok: true,
    contactsUpserted: result.contactsUpserted,
    eventsInserted: result.eventsInserted,
    eventsSkipped: result.eventsSkipped,
    contactsEnqueued: result.contactsEnqueued,
    requested: limited.length,
  });
}
