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
  const { id } = await params;
  const bank = await prisma.rtKnowledgeBank.findFirst({
    where: { id, accountId },
    include: {
      documents: {
        select: { id: true, filename: true, label: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  return NextResponse.json({
    knowledge_bank_id: bank.id,
    name: bank.name,
    documents: bank.documents,
  });
}
