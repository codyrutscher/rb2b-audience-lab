import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { PIXEL_FIELDS, OPERATORS } from "@/lib/reactivate/pixelFields";

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
    include: { rules: true, ruleGroups: { include: { rules: true } } },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  return NextResponse.json({ rules: segment.rules, ruleGroups: segment.ruleGroups });
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
  const { rule_type, rule_value, field, operator, group_id } = body;

  const isLegacy = rule_type && RULE_TYPES.includes(rule_type as (typeof RULE_TYPES)[number]);
  const isNewStyle = field && operator && PIXEL_FIELDS.includes(field as (typeof PIXEL_FIELDS)[number]) && OPERATORS.includes(operator as (typeof OPERATORS)[number]);
  const ruleValue = typeof rule_value === "string" ? rule_value : "";

  if (!isLegacy && !isNewStyle) {
    return NextResponse.json(
      { error: "Use rule_type+rule_value (legacy) or field+operator+rule_value (pixel fields)" },
      { status: 400 }
    );
  }
  if (isNewStyle && !["is_empty", "is_not_empty"].includes(operator) && !ruleValue.trim()) {
    return NextResponse.json({ error: "rule_value required for this operator" }, { status: 400 });
  }

  const ruleType = isLegacy ? rule_type : "pixel_field";

  if (group_id) {
    const group = await prisma.rtSegmentRuleGroup.findFirst({
      where: { id: group_id, segmentId: segment.id },
    });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
  }

  const rule = await prisma.rtSegmentRule.create({
    data: {
      segmentId: segment.id,
      groupId: group_id || null,
      ruleType,
      ruleValue,
      field: isNewStyle ? field : null,
      operator: isNewStyle ? operator : null,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
