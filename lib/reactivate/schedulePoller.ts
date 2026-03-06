/**
 * Polls rt_pixel_schedules every 60s. For due schedules, enqueues FetchPixelDataJob
 * and updates last_run_at / next_run_at.
 */
import { prisma } from "./db";
import { enqueue } from "./queue";
import { JOB_NAMES } from "./queue";

const POLL_INTERVAL_MS = 60_000; // 1 minute

function addInterval(date: Date, type: string, value: number): Date {
  const out = new Date(date);
  if (type === "minutes") out.setMinutes(out.getMinutes() + value);
  else if (type === "hours") out.setHours(out.getHours() + value);
  else if (type === "days") out.setDate(out.getDate() + value);
  return out;
}

export async function pollSchedules(): Promise<number> {
  const now = new Date();
  const due = await prisma.rtPixelSchedule.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
    },
    include: { pixel: true },
  });

  let count = 0;
  const envKey = process.env.AUDIENCELAB_API_KEY?.trim();
  for (const s of due) {
    const hasKey = s.pixel.audiencelabApiKey?.trim() || envKey;
    if (!s.pixel.audiencelabPixelId || !hasKey) continue;

    await enqueue(JOB_NAMES.FetchPixelData, { pixel_id: s.pixelId, schedule_id: s.id });
    const nextRunAt = addInterval(now, s.intervalType, s.intervalValue);
    await prisma.rtPixelSchedule.update({
      where: { id: s.id },
      data: { lastRunAt: now, nextRunAt, updatedAt: now },
    });
    count++;
    console.log(`[SchedulePoller] enqueued FetchPixelDataJob for pixel ${s.pixelId}, next_run=${nextRunAt.toISOString()}`);
  }
  return count;
}

export function startSchedulePoller(): void {
  setInterval(async () => {
    try {
      await pollSchedules();
    } catch (err) {
      console.error("[SchedulePoller] error:", err);
    }
  }, POLL_INTERVAL_MS);
  console.log("[SchedulePoller] started (every 60s)");
}
