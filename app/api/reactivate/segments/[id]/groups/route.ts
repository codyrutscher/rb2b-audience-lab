import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const LOGICAL_OPS = ["AND", "OR"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId } = await params;
  const segment = await prisma.rtSegment.findFirst({
    where: { id: segmentId, accountId },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const body = await request.json();
  const { logical_op } = body;
  if (!logical_op || !LOGICAL_OPS.includes(logical_op as (typeof LOGICAL_OPS)[number])) {
    return NextResponse.json(
      { error: `logical_op must be one of: ${LOGICAL_OPS.join(", ")}` },
      { status: 400 }
    );
  }
  const maxOrder = await prisma.rtSegmentRuleGroup.aggregate({
    where: { segmentId },
    _max: { groupOrder: true },
  });
  const group = await prisma.rtSegmentRuleGroup.create({
    data: {
      segmentId,
      logicalOp: logical_op,
      groupOrder: (maxOrder._max.groupOrder ?? -1) + 1,
    },
    include: { rules: true },
  });
  return NextResponse.json(group, { status: 201 });
}
