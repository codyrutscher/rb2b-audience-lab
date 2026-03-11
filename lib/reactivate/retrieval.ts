import { embed } from "./embeddings";
import { getPinecone, getPineconeIndexName } from "./pinecone";
import { prisma } from "./db";

const DEFAULT_TOP_K = 8;

export interface RetrievedChunk {
  id: string;
  text: string;
  score?: number;
}

/**
 * Parse a single query hint field into multiple query strings.
 * Supports newlines, pipes, and semicolons as separators.
 */
export function parseQueryHints(value: string | null | undefined): string[] {
  if (value == null || typeof value !== "string") return [];
  return value
    .split(/[\n|;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function retrieveChunks(params: {
  accountId: string;
  knowledgeBankId: string;
  queryText: string;
  /** When set, only chunks from documents with this label are considered */
  documentLabel?: string | null;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const { accountId, knowledgeBankId, queryText, documentLabel, topK = DEFAULT_TOP_K } = params;
  const vector = await embed(queryText);
  const pc = getPinecone();
  const indexName = getPineconeIndexName();
  const index = pc.index(indexName);
  const ns = index.namespace(accountId);

  let filter: Record<string, unknown> = { knowledge_bank_id: { $eq: knowledgeBankId } };
  if (documentLabel?.trim()) {
    const docs = await prisma.rtKnowledgeDocument.findMany({
      where: {
        knowledgeBankId,
        label: documentLabel.trim(),
      },
      select: { id: true },
    });
    const docIds = docs.map((d) => d.id);
    if (docIds.length === 0) return [];
    filter = { ...filter, document_id: { $in: docIds } };
  }

  const results = await ns.query({
    vector,
    topK,
    includeMetadata: true,
    filter,
  });

  const matches = results.matches ?? [];
  const ids = matches.map((m) => m.id).filter(Boolean) as string[];
  if (ids.length === 0) {
    return [];
  }

  const chunks = await prisma.rtKnowledgeChunk.findMany({
    where: {
      id: { in: ids },
      knowledgeBankId,
    },
    select: { id: true, text: true },
  });
  const byId = new Map(chunks.map((c) => [c.id, c.text]));

  return matches
    .filter((m) => m.id && byId.has(m.id))
    .map((m) => ({
      id: m.id!,
      text: byId.get(m.id!)!,
      score: m.score,
    }));
}

/**
 * Retrieve chunks using multiple queries and merge results (deduped by chunk id).
 * Useful for pulling different angles (e.g. benefits, pricing, social proof) into one email.
 */
export async function retrieveChunksFromQueries(params: {
  accountId: string;
  knowledgeBankId: string;
  queryTexts: string[];
  topKPerQuery?: number;
  maxTotalChunks?: number;
}): Promise<RetrievedChunk[]> {
  const {
    accountId,
    knowledgeBankId,
    queryTexts,
    topKPerQuery = 4,
    maxTotalChunks = 16,
  } = params;
  const uniqueQueries = [...new Set(queryTexts.map((q) => q.trim()).filter(Boolean))];
  if (uniqueQueries.length === 0) return [];
  if (uniqueQueries.length === 1) {
    return retrieveChunks({
      accountId,
      knowledgeBankId,
      queryText: uniqueQueries[0],
      topK: Math.min(topKPerQuery * 2, maxTotalChunks),
    });
  }

  const seen = new Map<string, { text: string; score: number }>();
  for (const queryText of uniqueQueries) {
    const chunks = await retrieveChunks({
      accountId,
      knowledgeBankId,
      queryText,
      topK: topKPerQuery,
    });
    for (const c of chunks) {
      const score = c.score ?? 0;
      if (!seen.has(c.id) || (seen.get(c.id)!.score < score)) {
        seen.set(c.id, { text: c.text, score });
      }
    }
    if (seen.size >= maxTotalChunks) break;
  }

  const ordered = Array.from(seen.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, maxTotalChunks);
  return ordered.map(([id, { text, score }]) => ({ id, text, score }));
}
