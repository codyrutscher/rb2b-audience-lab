import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

/**
 * GET /api/reactivate/email-sends
 * Email send logs for the account (resolved email, template, status).
 */
export async function GET(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const sends = await prisma.rtEmailSend.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      contact: { select: { id: true, email: true, firstName: true } },
      segmentCampaign: { select: { id: true, segment: { select: { name: true } } } },
    },
  });
  return NextResponse.json({ sends });
}
