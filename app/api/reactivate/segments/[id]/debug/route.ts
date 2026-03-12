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
  const { id: segmentId } = await params;

  try {
    // Get account to find workspace_id
    const account = await prisma.rtAccount.findUnique({
      where: { id: accountId },
      select: { workspaceId: true },
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get segment with all rules
    const segment = await prisma.rtSegment.findFirst({
      where: { id: segmentId, accountId },
      include: {
        rules: true,
        ruleGroups: { include: { rules: true }, orderBy: { groupOrder: "asc" } },
        pixel: true,
      },
    });
    
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Get sample visitors using workspace_id
    const whereClause = segment.pixelId 
      ? `workspace_id = $1::uuid AND pixel_id = $2::uuid`
      : `workspace_id = $1::uuid`;
    const params = segment.pixelId 
      ? [account.workspaceId, segment.pixelId]
      : [account.workspaceId];
    
    const visitors = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM visitors WHERE ${whereClause} ORDER BY last_seen DESC LIMIT 10`,
      ...params
    );

    return NextResponse.json({
      segment: {
        id: segment.id,
        name: segment.name,
        pixelId: segment.pixelId,
        pixel: segment.pixel ? {
          id: segment.pixel.id,
          name: segment.pixel.name,
          websiteName: segment.pixel.websiteName,
        } : null,
        ungroupedRules: segment.rules.filter(r => !r.groupId),
        ruleGroups: segment.ruleGroups.map(g => ({
          id: g.id,
          logicalOp: g.logicalOp,
          rules: g.rules,
        })),
      },
      visitors: visitors.map(v => ({
        id: v.id,
        email: v.email,
        company: v.company,
        city: v.city,
        country: v.country,
        page_views: v.page_views,
        landing_page: v.landing_page,
        device_type: v.device_type,
        pixel_id: v.pixel_id,
      })),
      visitorCount: visitors.length,
      accountId,
      workspaceId: account.workspaceId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
  }
}
