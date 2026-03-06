import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId, ruleId } = await params;
  const segment = await prisma.rtSegment.findFirst({
    where: { id: segmentId, accountId },
    include: { rules: true },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const rule = segment.rules.find((r) => r.id === ruleId);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  const body = await request.json();
  const { rule_type, rule_value } = body;
  const updated = await prisma.rtSegmentRule.update({
    where: { id: ruleId },
    data: {
      ...(rule_type && RULE_TYPES.includes(rule_type as (typeof RULE_TYPES)[number]) && { ruleType: rule_type }),
      ...(typeof rule_value === "string" && { ruleValue: rule_value }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId, ruleId } = await params;
  const segment = await prisma.rtSegment.findFirst({
    where: { id: segmentId, accountId },
    include: { rules: true },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const rule = segment.rules.find((r) => r.id === ruleId);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  await prisma.rtSegmentRule.delete({ where: { id: ruleId } });
  return new NextResponse(null, { status: 204 });
}
