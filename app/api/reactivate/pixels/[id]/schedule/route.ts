import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const INTERVAL_TYPES = ["minutes", "hours", "days"] as const;

/**
 * GET /api/reactivate/pixels/[id]/schedule
 * Get schedule for pixel (one per pixel).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: pixelId } = await params;
  const pixel = await prisma.rtPixel.findFirst({
    where: { id: pixelId, accountId },
    include: { schedule: true },
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  return NextResponse.json({ schedule: pixel.schedule });
}

/**
 * POST /api/reactivate/pixels/[id]/schedule
 * Create or update schedule (upsert). Body: { interval_type, interval_value, enabled? }
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
    include: { schedule: true },
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  const body = await request.json();
  const { interval_type, interval_value, enabled } = body;

  if (!interval_type || !INTERVAL_TYPES.includes(interval_type as (typeof INTERVAL_TYPES)[number])) {
    return NextResponse.json(
      { error: `interval_type must be one of: ${INTERVAL_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  const val = Number(interval_value);
  if (!Number.isInteger(val) || val < 1) {
    return NextResponse.json({ error: "interval_value must be a positive integer" }, { status: 400 });
  }

  const now = new Date();
  const nextRunAt = addInterval(now, interval_type as (typeof INTERVAL_TYPES)[number], val);

  const schedule = await prisma.rtPixelSchedule.upsert({
    where: { pixelId },
    create: {
      pixelId,
      accountId,
      intervalType: interval_type,
      intervalValue: val,
      enabled: enabled !== false,
      nextRunAt,
    },
    update: {
      intervalType: interval_type,
      intervalValue: val,
      enabled: enabled !== false,
      nextRunAt,
      updatedAt: now,
    },
  });
  return NextResponse.json({ schedule }, { status: 201 });
}

/**
 * DELETE /api/reactivate/pixels/[id]/schedule
 * Remove schedule.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: pixelId } = await params;
  const pixel = await prisma.rtPixel.findFirst({
    where: { id: pixelId, accountId },
    include: { schedule: true },
  });
  if (!pixel) {
    return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
  }
  if (!pixel.schedule) {
    return NextResponse.json({ error: "No schedule for this pixel" }, { status: 404 });
  }
  await prisma.rtPixelSchedule.delete({
    where: { pixelId },
  });
  return new Response(null, { status: 204 });
}

function addInterval(
  date: Date,
  type: (typeof INTERVAL_TYPES)[number],
  value: number
): Date {
  const out = new Date(date);
  if (type === "minutes") {
    out.setMinutes(out.getMinutes() + value);
  } else if (type === "hours") {
    out.setHours(out.getHours() + value);
  } else if (type === "days") {
    out.setDate(out.getDate() + value);
  }
  return out;
}
