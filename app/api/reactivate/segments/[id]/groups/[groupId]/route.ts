import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: segmentId, groupId } = await params;
  const segment = await prisma.rtSegment.findFirst({
    where: { id: segmentId, accountId },
  });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }
  const group = await prisma.rtSegmentRuleGroup.findFirst({
    where: { id: groupId, segmentId },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  await prisma.rtSegmentRuleGroup.delete({ where: { id: groupId } });
  return new NextResponse(null, { status: 204 });
}
