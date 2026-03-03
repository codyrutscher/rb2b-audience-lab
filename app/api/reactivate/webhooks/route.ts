import { NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const webhooks = await prisma.rtWebhook.findMany({
    where: { accountId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ webhooks });
}
