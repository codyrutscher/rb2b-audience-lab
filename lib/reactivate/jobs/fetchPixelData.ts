/**
 * FetchPixelDataJob: fetch pixel v4 data from Audiencelab API and ingest.
 * Paginates through all pages, upserts contacts/events, enqueues EvaluateSegmentsJob.
 * Supports scheduleId for run history logging.
 */
import { fetchPixelData, PAGE_DELAY_MS } from "../pixelApi";
import { ingestPixelData, type IngestResult } from "./ingestPixelData";
import { prisma } from "../db";

const PAGE_SIZE = 100;

export async function runFetchPixelDataJob(
  pixelId: string,
  scheduleId?: string | null
): Promise<IngestResult & { pagesFetched: number }> {
  const pixel = await prisma.rtPixel.findUnique({
    where: { id: pixelId },
    select: { id: true, accountId: true, audiencelabPixelId: true, audiencelabApiKey: true },
  });

  if (!pixel) {
    throw new Error(`Pixel not found: ${pixelId}`);
  }
  if (!pixel.audiencelabPixelId) {
    throw new Error(`Pixel ${pixelId} has no audiencelab_pixel_id (create via API first)`);
  }
  const apiKey = pixel.audiencelabApiKey?.trim() || process.env.AUDIENCELAB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(`Pixel ${pixelId} has no API key (set per-pixel or AUDIENCELAB_API_KEY env)`);
  }

  const totals: IngestResult = {
    contactsUpserted: 0,
    eventsInserted: 0,
    eventsSkipped: 0,
    contactsEnqueued: 0,
  };
  let page = 1;
  let totalPages = 1;
  let runId: string | null = null;
  if (scheduleId) {
    const run = await prisma.rtScheduleRun.create({
      data: { scheduleId, status: "running" },
    });
    runId = run.id;
  }

  try {
    do {
      if (page > 1) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
      const data = await fetchPixelData(
        apiKey,
        pixel.audiencelabPixelId,
        page,
        PAGE_SIZE
      );
    totalPages = data.total_pages;
    const events = data.events || [];

    if (events.length > 0) {
      const result = await ingestPixelData(
        pixel.id,
        pixel.audiencelabPixelId,
        pixel.accountId,
        events
      );
      totals.contactsUpserted += result.contactsUpserted;
      totals.eventsInserted += result.eventsInserted;
      totals.eventsSkipped += result.eventsSkipped;
      totals.contactsEnqueued += result.contactsEnqueued;
    }

    page++;
  } while (page <= totalPages);

  if (runId) {
    await prisma.rtScheduleRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        completedAt: new Date(),
        pagesFetched: page - 1,
        contactsUpserted: totals.contactsUpserted,
        eventsInserted: totals.eventsInserted,
        eventsSkipped: totals.eventsSkipped,
        contactsEnqueued: totals.contactsEnqueued,
      },
    });
  }
  return { ...totals, pagesFetched: page - 1 };
  } catch (err) {
    if (runId) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.rtScheduleRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          completedAt: new Date(),
          pagesFetched: page - 1,
          contactsUpserted: totals.contactsUpserted,
          eventsInserted: totals.eventsInserted,
          eventsSkipped: totals.eventsSkipped,
          contactsEnqueued: totals.contactsEnqueued,
          error: msg,
        },
      });
    }
    throw err;
  }
}
