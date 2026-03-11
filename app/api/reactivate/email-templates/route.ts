import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";
import { normalizeChunkQueryVariablesPayload } from "@/lib/reactivate/chunkQueryVariablesApi";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await prisma.rtEmailTemplate.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { knowledgeBank: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    name,
    knowledge_bank_id,
    copy_prompt,
    subject_template,
    template_id,
    query_hint,
    chunk_query_variables,
    cta_url,
    cta_label,
    variable_mappings,
    recovery_type,
    slot_defaults,
    enabled,
  } = body;

  if (!name?.trim() || !knowledge_bank_id?.trim()) {
    return NextResponse.json(
      { error: "name and knowledge_bank_id are required" },
      { status: 400 }
    );
  }

  const bank = await prisma.rtKnowledgeBank.findFirst({
    where: { id: knowledge_bank_id, accountId },
  });
  if (!bank) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
  }

  const templateId = (template_id?.trim() || "minimal_recovery") as (typeof TEMPLATE_IDS)[number];
  if (!TEMPLATE_IDS.includes(templateId)) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }

  const variableMappings =
    variable_mappings && typeof variable_mappings === "object" && !Array.isArray(variable_mappings)
      ? variable_mappings
      : {};

  const recoveryType = ["reminder", "product_interest", "social_proof", "objection_handling", "survey_qualification"].includes(
    recovery_type?.trim()
  )
    ? recovery_type.trim()
    : "product_interest";

  const slotDefaults =
    slot_defaults && typeof slot_defaults === "object" && !Array.isArray(slot_defaults)
      ? slot_defaults
      : {};

  const chunkQueryVariables = normalizeChunkQueryVariablesPayload(chunk_query_variables);

  const template = await prisma.rtEmailTemplate.create({
    data: {
      accountId,
      name: name.trim(),
      knowledgeBankId: knowledge_bank_id,
      copyPrompt: copy_prompt?.trim() || null,
      subjectTemplate: subject_template?.trim() || "We have something for you",
      templateId,
      queryHint: query_hint?.trim() || null,
      chunkQueryVariables: chunkQueryVariables ?? undefined,
      ctaUrl: cta_url?.trim() || null,
      ctaLabel: cta_label?.trim() || null,
      variableMappings,
      recoveryType,
      slotDefaults,
      enabled: !!enabled,
    },
    include: { knowledgeBank: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ template }, { status: 201 });
}
