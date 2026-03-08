import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { generateCopy } from "@/lib/reactivate/copyGeneration";
import { retrieveChunks } from "@/lib/reactivate/retrieval";
import { prisma } from "@/lib/reactivate/db";

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    knowledge_bank_id,
    query,
    first_name,
    cta_label,
    query_hint,
    custom_prompt,
    top_k,
    extra_variables,
  } = body;
  const knowledgeBankId =
    typeof knowledge_bank_id === "string" ? knowledge_bank_id.trim() : "";
  const queryText = typeof query === "string" ? query.trim() : "";
  if (!knowledgeBankId || !queryText) {
    return NextResponse.json(
      { error: "knowledge_bank_id and query are required" },
      { status: 400 }
    );
  }
  const bank = await prisma.rtKnowledgeBank.findFirst({
    where: { id: knowledgeBankId, accountId },
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }
  try {
    let chunks: { id: string; text: string; score?: number }[];
    try {
      chunks = await retrieveChunks({
        accountId,
        knowledgeBankId,
        queryText: query,
        topK: typeof top_k === "number" ? top_k : 8,
      });
    } catch (retrievalErr) {
      const msg = retrievalErr instanceof Error ? retrievalErr.message : String(retrievalErr);
      console.error("[copy-with-retrieval] retrieval failed:", msg);
      throw new Error(`Retrieval failed: ${msg}`);
    }
    const retrievedText =
      chunks.length > 0
        ? chunks.map((c) => c.text).join("\n\n")
        : bank.description || "No relevant content found.";
    const extraVariables =
      extra_variables && typeof extra_variables === "object" && !Array.isArray(extra_variables)
        ? extra_variables
        : undefined;
    let copy: string;
    try {
      copy = await generateCopy({
        retrievedText,
        firstName: first_name ?? null,
        ctaLabel: cta_label ?? null,
        queryHint: query_hint ?? null,
        customPrompt: custom_prompt ?? null,
        extraVariables,
        maxNewTokens: 350,
      });
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error("[copy-with-retrieval] copy generation failed:", msg);
      throw new Error(`Copy generation failed: ${msg}`);
    }
    const payload: Record<string, unknown> = {
      retrieved_text: retrievedText,
      retrieved_preview: retrievedText.slice(0, 400) + (retrievedText.length > 400 ? "…" : ""),
      chunks: chunks.length,
      copy,
    };
    if (chunks.length === 0) {
      const [chunkCount, docStatuses] = await Promise.all([
        prisma.rtKnowledgeChunk.count({ where: { knowledgeBankId } }),
        prisma.rtKnowledgeDocument.groupBy({
          by: ["status"],
          where: { knowledgeBankId },
          _count: true,
        }),
      ]);
      payload.retrieval_hint =
        "0 chunks from Pinecone. Ensure: (1) Worker running: npm run worker. " +
        "(2) Docs indexed: KB status should show 'indexed' not 'chunked'. " +
        `(3) This KB: ${chunkCount} chunks in DB, doc statuses: ${JSON.stringify(docStatuses.map((s) => `${s.status}:${s._count}`))}.`;
    }
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[copy-with-retrieval] 500:", message);
    return NextResponse.json(
      { error: "Copy with retrieval failed", detail: message },
      { status: 500 }
    );
  }
}
