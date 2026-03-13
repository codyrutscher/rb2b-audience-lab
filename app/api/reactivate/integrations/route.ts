import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.rtIntegration.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ integrations });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, platform, config } = body;

  if (!name || !platform) {
    return NextResponse.json({ error: "name and platform required" }, { status: 400 });
  }

  const integration = await prisma.rtIntegration.create({
    data: {
      accountId,
      name,
      platform,
      config: config || {},
    },
  });

  return NextResponse.json(integration, { status: 201 });
}
