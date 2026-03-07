import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db";
import { enqueue, JOB_NAMES } from "../queue";
import { downloadDocument } from "../storage";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const CHUNK_CHARS = 2400;
const OVERLAP_CHARS = 300;

function chunkText(text: string): { text: string; index: number }[] {
  const chunks: { text: string; index: number }[] = [];
  let start = 0;
  let index = 0;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return chunks;
  while (start < normalized.length) {
    let end = start + CHUNK_CHARS;
    if (end < normalized.length) {
      const nextNewline = normalized.indexOf("\n", end);
      if (nextNewline !== -1 && nextNewline < end + 500) end = nextNewline + 1;
      else {
        const lastSpace = normalized.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace + 1;
      }
    }
    chunks.push({ text: normalized.slice(start, end).trim(), index });
    start = end - OVERLAP_CHARS;
    if (start >= normalized.length) break;
    index += 1;
  }
  return chunks;
}

async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") {
    try {
      const pdfParse = await import("pdf-parse");
      const data = await pdfParse.default(buffer);
      return data.text || "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PDF could not be parsed (${msg}). Try re-saving the PDF or export as .txt and upload that instead.`
      );
    }
  }
  return buffer.toString("utf-8");
}

export async function processKnowledgeDocument(documentId: string): Promise<void> {
  const doc = await prisma.rtKnowledgeDocument.findUnique({
    where: { id: documentId },
    include: { knowledgeBank: true },
  });
  if (!doc) return;
  console.log(`[ProcessKnowledgeDoc] document_id=${documentId} filename=${doc.filename}`);
  if (!doc.storagePath) {
    await prisma.rtKnowledgeDocument.update({
      where: { id: documentId },
      data: { status: "failed" },
    });
    return;
  }

  let buffer: Buffer;
  const fullPath = path.join(UPLOAD_DIR, doc.storagePath);
  if (fs.existsSync(fullPath)) {
    buffer = fs.readFileSync(fullPath);
  } else {
    const downloaded = await downloadDocument(doc.storagePath);
    if (!downloaded) {
      await prisma.rtKnowledgeDocument.update({
        where: { id: documentId },
        data: { status: "failed" },
      });
      return;
    }
    buffer = downloaded;
  }

  await prisma.rtKnowledgeDocument.update({
    where: { id: documentId },
    data: { status: "processing" },
  });

  try {
    const text = await extractTextFromBuffer(buffer, doc.filename);
    const chunks = chunkText(text);

    await prisma.rtKnowledgeChunk.deleteMany({ where: { documentId } });

    for (const { text: chunkText_, index } of chunks) {
      const chunkId = `${documentId}_${index}`;
      await prisma.rtKnowledgeChunk.create({
        data: {
          id: chunkId,
          knowledgeBankId: doc.knowledgeBankId,
          documentId: doc.id,
          chunkIndex: index,
          text: chunkText_,
          metadata: {},
        },
      });
    }

    await prisma.rtKnowledgeDocument.update({
      where: { id: documentId },
      data: { status: "chunked" },
    });
    await enqueue(JOB_NAMES.IndexKnowledgeBankDoc, { document_id: documentId });
  } catch (err) {
    await prisma.rtKnowledgeDocument.update({
      where: { id: documentId },
      data: { status: "failed" },
    });
    throw err;
  }
}
