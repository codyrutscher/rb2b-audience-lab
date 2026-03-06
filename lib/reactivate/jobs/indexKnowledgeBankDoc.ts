import { prisma } from "../db";
import { embed } from "../embeddings";
import { getPinecone, getPineconeIndexName } from "../pinecone";

export async function indexKnowledgeBankDocument(documentId: string): Promise<void> {
  if (!process.env.HUGGINGFACE_TOKEN?.trim() || !process.env.PINECONE_API_KEY?.trim()) {
    console.log(`[IndexKnowledgeBankDoc] document_id=${documentId} skipped (missing HUGGINGFACE_TOKEN or PINECONE_API_KEY)`);
    return;
  }
  const doc = await prisma.rtKnowledgeDocument.findUnique({
    where: { id: documentId },
    include: { knowledgeBank: { select: { accountId: true } } },
  });
  if (!doc) return;
  const accountId = doc.knowledgeBank.accountId;

  const chunks = await prisma.rtKnowledgeChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
  });
  if (chunks.length === 0) {
    console.log(`[IndexKnowledgeBankDoc] document_id=${documentId} filename=${doc.filename} no chunks, marking indexed`);
    await prisma.rtKnowledgeDocument.update({
      where: { id: documentId },
      data: { status: "indexed" },
    });
    return;
  }

  console.log(`[IndexKnowledgeBankDoc] document_id=${documentId} filename=${doc.filename} indexing ${chunks.length} chunks`);
  const pc = getPinecone();
  const indexName = getPineconeIndexName();
  const index = pc.index(indexName);
  const ns = index.namespace(accountId);

  const records: { id: string; values: number[]; metadata: Record<string, string> }[] = [];

  for (const chunk of chunks) {
    const values = await embed(chunk.text);
    records.push({
      id: chunk.id,
      values,
      metadata: {
        account_id: accountId,
        knowledge_bank_id: doc.knowledgeBankId,
        document_id: documentId,
      },
    });
  }

  await ns.upsert(records);

  await prisma.rtKnowledgeDocument.update({
    where: { id: documentId },
    data: { status: "indexed" },
  });
}

export async function indexKnowledgeBankDocumentSafe(documentId: string): Promise<void> {
  try {
    await indexKnowledgeBankDocument(documentId);
  } catch (err) {
    await prisma.rtKnowledgeDocument.update({
      where: { id: documentId },
      data: { status: "failed" },
    });
    throw err;
  }
}
