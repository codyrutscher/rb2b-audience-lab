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
    include: { _count: { select: { documents: true } } },
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  return NextResponse.json(bank);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtKnowledgeBank.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  const body = await request.json();
  const { name, description } = body;
  const bank = await prisma.rtKnowledgeBank.update({
    where: { id },
    data: {
      ...(typeof name === "string" && { name: name.trim() }),
      ...(typeof description === "string" && { description }),
    },
  });
  return NextResponse.json(bank);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtKnowledgeBank.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  await prisma.rtKnowledgeBank.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
