import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const template = await prisma.rtEmailTemplate.findFirst({
    where: { id, accountId },
    include: { knowledgeBank: { select: { id: true, name: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json(template);
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
  const existing = await prisma.rtEmailTemplate.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  const body = await request.json();
  const {
    name,
    knowledge_bank_id,
    copy_prompt,
    subject_template,
    template_id,
    query_hint,
    cta_url,
    cta_label,
    variable_mappings,
    recovery_type,
    slot_defaults,
    enabled,
  } = body;

  if (knowledge_bank_id) {
    const bank = await prisma.rtKnowledgeBank.findFirst({
      where: { id: knowledge_bank_id, accountId },
    });
    if (!bank) {
      return NextResponse.json({ error: "Knowledge bank not found" }, { status: 404 });
    }
  }
  if (template_id && !TEMPLATE_IDS.includes(template_id as (typeof TEMPLATE_IDS)[number])) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }

  const variableMappings =
    variable_mappings !== undefined
      ? (variable_mappings && typeof variable_mappings === "object" && !Array.isArray(variable_mappings)
          ? variable_mappings
          : {})
      : undefined;

  const validRecoveryTypes = ["reminder", "product_interest", "social_proof", "objection_handling", "survey_qualification"];
  const recoveryType =
    recovery_type !== undefined && validRecoveryTypes.includes(recovery_type?.trim())
      ? recovery_type.trim()
      : undefined;

  const slotDefaults =
    slot_defaults !== undefined
      ? (slot_defaults && typeof slot_defaults === "object" && !Array.isArray(slot_defaults)
          ? slot_defaults
          : {})
      : undefined;

  const template = await prisma.rtEmailTemplate.update({
    where: { id },
    data: {
      ...(typeof name === "string" && { name: name.trim() }),
      ...(knowledge_bank_id && { knowledgeBankId: knowledge_bank_id }),
      ...(copy_prompt !== undefined && { copyPrompt: copy_prompt?.trim() || null }),
      ...(subject_template !== undefined && { subjectTemplate: subject_template?.trim() || "We have something for you" }),
      ...(template_id && { templateId: template_id }),
      ...(query_hint !== undefined && { queryHint: query_hint?.trim() || null }),
      ...(cta_url !== undefined && { ctaUrl: cta_url?.trim() || null }),
      ...(cta_label !== undefined && { ctaLabel: cta_label?.trim() || null }),
      ...(variableMappings !== undefined && { variableMappings }),
      ...(recoveryType !== undefined && { recoveryType }),
      ...(slotDefaults !== undefined && { slotDefaults }),
      ...(typeof enabled === "boolean" && { enabled }),
    },
    include: { knowledgeBank: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ template });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtEmailTemplate.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  await prisma.rtEmailTemplate.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
