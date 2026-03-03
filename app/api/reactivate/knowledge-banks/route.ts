import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const banks = await prisma.rtKnowledgeBank.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });
  return NextResponse.json({ knowledge_banks: banks });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { name, description } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const bank = await prisma.rtKnowledgeBank.create({
    data: {
      accountId,
      name: name.trim(),
      description: typeof description === "string" ? description : null,
    },
  });
  return NextResponse.json(bank, { status: 201 });
}
