import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

/**
 * PATCH /api/reactivate/knowledge-banks/:id/documents/:docId
 * Update document fields (e.g. label for "Pricing").
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: knowledgeBankId, docId } = await params;
  const bank = await prisma.rtKnowledgeBank.findFirst({
    where: { id: knowledgeBankId, accountId },
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  const doc = await prisma.rtKnowledgeDocument.findFirst({
    where: { id: docId, knowledgeBankId },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  if (!("label" in body)) {
    return NextResponse.json({ error: "body.label required" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? (body.label.trim() || null) : null;
  const updated = await prisma.rtKnowledgeDocument.update({
    where: { id: docId },
    data: { label },
    select: { id: true, filename: true, label: true, status: true },
  });
  return NextResponse.json({ document: updated });
}
