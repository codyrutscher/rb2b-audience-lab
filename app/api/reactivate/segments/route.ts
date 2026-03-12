import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Support filtering by pixel_id via query param
  const url = new URL(request.url);
  const pixelId = url.searchParams.get("pixel_id");
  
  const segments = await prisma.rtSegment.findMany({
    where: { 
      accountId,
      ...(pixelId ? { pixelId } : {})
    },
    orderBy: { priority: "asc" },
    include: { 
      rules: true, 
      ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } },
      pixel: true
    },
  });
  return NextResponse.json({ segments });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name, priority, is_suppression, enabled, pixel_id } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  
  // Verify pixel belongs to account if pixel_id provided
  if (pixel_id) {
    const pixel = await prisma.rtPixel.findFirst({
      where: { id: pixel_id, accountId }
    });
    if (!pixel) {
      return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
    }
  }
  
  const seg = await prisma.rtSegment.create({
    data: {
      accountId,
      pixelId: pixel_id || null,
      name: name.trim(),
      priority: typeof priority === "number" ? priority : 999,
      isSuppression: !!is_suppression,
      enabled: enabled !== false,
    },
    include: { rules: true, pixel: true },
  });
  return NextResponse.json(seg, { status: 201 });
}
