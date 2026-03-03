import path from "node:path";
import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { enqueue, JOB_NAMES } from "@/lib/reactivate/queue";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

function getUploadDir(accountId: string, knowledgeBankId: string, documentId: string) {
  const dir = path.join(UPLOAD_DIR, accountId, knowledgeBankId, documentId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function POST(
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
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No file in request; use multipart field 'file'" },
      { status: 400 }
    );
  }

  const doc = await prisma.rtKnowledgeDocument.create({
    data: {
      knowledgeBankId: bank.id,
      filename: "pending",
      status: "pending",
    },
  });

  const dir = getUploadDir(accountId, bank.id, doc.id);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const filePath = path.join(dir, safeName);

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(bytes));

  const storagePath = path.relative(UPLOAD_DIR, filePath);
  await prisma.rtKnowledgeDocument.update({
    where: { id: doc.id },
    data: { filename: file.name, storagePath },
  });

  await enqueue(JOB_NAMES.ProcessKnowledgeDoc, { document_id: doc.id });

  return NextResponse.json(
    {
      document_id: doc.id,
      filename: file.name,
      message: "Document uploaded; processing enqueued",
    },
    { status: 202 }
  );
}
