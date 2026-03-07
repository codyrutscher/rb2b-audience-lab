import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { enqueue, JOB_NAMES } from "@/lib/reactivate/queue";
import { uploadDocument } from "@/lib/reactivate/storage";

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

  const ALLOWED_EXT = [".pdf", ".txt", ".md", ".markdown"];
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No file in request; use multipart field 'file'" },
      { status: 400 }
    );
  }
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: `File type not supported. Use: ${ALLOWED_EXT.join(", ")}` },
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

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const storagePath = await uploadDocument(accountId, bank.id, doc.id, file.name, buffer);
  if (!storagePath) {
    await prisma.rtKnowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: "Upload failed. Ensure Supabase Storage bucket 'knowledge-documents' exists and SUPABASE_SERVICE_ROLE_KEY is set." },
      { status: 500 }
    );
  }

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
