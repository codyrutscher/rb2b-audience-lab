import { NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const account = await prisma.rtAccount.findUnique({
    where: { id: accountId },
    include: {
      webhooks: { select: { id: true, createdAt: true } },
      _count: {
        select: { segments: true, knowledgeBanks: true, segmentCampaigns: true },
      },
    },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({
    account_id: account.id,
    workspace_id: account.workspaceId,
    webhooks: account.webhooks,
    counts: account._count,
  });
}
