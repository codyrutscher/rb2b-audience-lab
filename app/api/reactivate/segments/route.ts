import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const segments = await prisma.rtSegment.findMany({
    where: { accountId },
    orderBy: { priority: "asc" },
    include: { rules: true, ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } } },
  });
  return NextResponse.json({ segments });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name, priority, is_suppression, enabled } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const seg = await prisma.rtSegment.create({
    data: {
      accountId,
      name: name.trim(),
      priority: typeof priority === "number" ? priority : 999,
      isSuppression: !!is_suppression,
      enabled: enabled !== false,
    },
    include: { rules: true },
  });
  return NextResponse.json(seg, { status: 201 });
}
