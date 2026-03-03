import { embed } from "./embeddings";
import { getPinecone, getPineconeIndexName } from "./pinecone";
import { prisma } from "./db";

const DEFAULT_TOP_K = 8;

export interface RetrievedChunk {
  id: string;
  text: string;
  score?: number;
}

export async function retrieveChunks(params: {
  accountId: string;
  knowledgeBankId: string;
  queryText: string;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const { accountId, knowledgeBankId, queryText, topK = DEFAULT_TOP_K } = params;
  const vector = await embed(queryText);
  const pc = getPinecone();
  const indexName = getPineconeIndexName();
  const index = pc.index(indexName);
  const ns = index.namespace(accountId);

  const results = await ns.query({
    vector,
    topK,
    includeMetadata: true,
    filter: { knowledge_bank_id: { $eq: knowledgeBankId } },
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
