import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const RULE_TYPES = ["url_contains", "url_regex", "event_type", "has_email"] as const;

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
    include: { rules: true },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  return NextResponse.json({ rules: segment.rules });
}

export async function POST(
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
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const body = await request.json();
  const { rule_type, rule_value } = body;
  if (!rule_type || !RULE_TYPES.includes(rule_type as (typeof RULE_TYPES)[number])) {
    return NextResponse.json(
      { error: `rule_type must be one of: ${RULE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  const rule = await prisma.rtSegmentRule.create({
    data: {
      segmentId: segment.id,
      ruleType: rule_type,
      ruleValue: typeof rule_value === "string" ? rule_value : "",
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
