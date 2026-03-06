import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const segment = await prisma.rtSegment.findFirst({
    where: { id, accountId },
    include: { rules: true, ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } } },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  return NextResponse.json(segment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtSegment.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const body = await request.json();
  const { name, priority, is_suppression, enabled } = body;
  const segment = await prisma.rtSegment.update({
    where: { id },
    data: {
      ...(typeof name === "string" && { name: name.trim() }),
      ...(typeof priority === "number" && { priority }),
      ...(typeof is_suppression === "boolean" && { isSuppression: is_suppression }),
      ...(typeof enabled === "boolean" && { enabled }),
    },
    include: { rules: true, ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } } },
  });
  return NextResponse.json(segment);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtSegment.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  await prisma.rtSegment.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
