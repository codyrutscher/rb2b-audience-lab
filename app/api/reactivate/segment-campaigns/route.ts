import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";
import { EMAIL_FIELD_MAP_OPTIONS } from "@/lib/reactivate/emailResolution";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaigns = await prisma.rtSegmentCampaign.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: {
      segment: { select: { id: true, name: true, isSuppression: true } },
      knowledgeBank: { select: { id: true, name: true } },
      emailTemplate: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({
    segment_campaigns: campaigns,
    email_field_options: EMAIL_FIELD_MAP_OPTIONS,
  });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    segment_id,
    email_template_id,
    template_id,
    subject_text,
    cta_url,
    cta_label,
    query_hint,
    copy_prompt,
    email_field_map,
    enabled,
    trigger_type,
    trigger_interval_type,
    trigger_interval_value,
  } = body;
  if (!segment_id) {
    return NextResponse.json(
      { error: "segment_id is required" },
      { status: 400 }
    );
  }

  // Resolve template — either from a saved email_template_id or a preset template_id
  let knowledge_bank_id_resolved: string | null = null;
  let templateIdResolved: string = template_id?.trim() || "minimal_recovery";
  let resolvedSubject = subject_text?.trim() || "We have something for you";
  let resolvedCtaUrl = cta_url?.trim() || null;
  let resolvedCtaLabel = cta_label?.trim() || null;
  let resolvedQueryHint = query_hint?.trim() || null;
  let resolvedCopyPrompt = copy_prompt ?? null;
  let emailTemplateIdToStore: string | null = null;

  if (email_template_id?.trim()) {
    // Custom template from DB
    const tpl = await prisma.rtEmailTemplate.findFirst({
      where: { id: email_template_id.trim(), accountId },
      select: { knowledgeBankId: true, copyPrompt: true, subjectTemplate: true, templateId: true, ctaUrl: true, ctaLabel: true, queryHint: true },
    });
    if (!tpl) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 });
    }
    knowledge_bank_id_resolved = tpl.knowledgeBankId;
    templateIdResolved = template_id?.trim() || tpl.templateId;
    resolvedSubject = subject_text?.trim() || tpl.subjectTemplate;
    resolvedCtaUrl = cta_url?.trim() || tpl.ctaUrl || null;
    resolvedCtaLabel = cta_label?.trim() || tpl.ctaLabel || null;
    resolvedQueryHint = query_hint?.trim() || tpl.queryHint || null;
    resolvedCopyPrompt = copy_prompt ?? tpl.copyPrompt ?? null;
    emailTemplateIdToStore = email_template_id.trim();
  }
  // else: using a preset template — no DB template needed
  if (enabled === true && (!email_field_map?.trim() || !EMAIL_FIELD_MAP_OPTIONS.includes(email_field_map.trim() as (typeof EMAIL_FIELD_MAP_OPTIONS)[number]))) {
    return NextResponse.json(
      { error: "When enabling, email_field_map is required and must be one of: " + EMAIL_FIELD_MAP_OPTIONS.join(", ") },
      { status: 400 }
    );
  }
  if (!TEMPLATE_IDS.includes(templateIdResolved)) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  const triggerTypeVal = (trigger_type?.trim() || "on_segment_update") as "on_segment_update" | "scheduled";
  if (triggerTypeVal !== "on_segment_update" && triggerTypeVal !== "scheduled") {
    return NextResponse.json({ error: "trigger_type must be on_segment_update or scheduled" }, { status: 400 });
  }
  if (triggerTypeVal === "scheduled") {
    const it = trigger_interval_type?.trim();
    const iv = trigger_interval_value != null ? Number(trigger_interval_value) : NaN;
    if (!it || !["minutes", "hours", "days"].includes(it) || !Number.isInteger(iv) || iv < 1) {
      return NextResponse.json(
        { error: "When scheduled, trigger_interval_type (minutes|hours|days) and trigger_interval_value (≥1) are required" },
        { status: 400 }
      );
    }
  }
  const segment = await prisma.rtSegment.findFirst({ where: { id: segment_id, accountId } });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 400 });
  }

  // Knowledge bank is optional for preset templates
  if (knowledge_bank_id_resolved) {
    const kb = await prisma.rtKnowledgeBank.findFirst({ where: { id: knowledge_bank_id_resolved, accountId } });
    if (!kb) {
      return NextResponse.json({ error: "Knowledge bank not found" }, { status: 400 });
    }
  }

  const campaign = await prisma.rtSegmentCampaign.create({
    data: {
      accountId,
      segmentId: segment_id,
      knowledgeBankId: knowledge_bank_id_resolved,
      emailTemplateId: emailTemplateIdToStore,
      templateId: templateIdResolved as any,
      subjectText: resolvedSubject,
      ctaUrl: resolvedCtaUrl,
      ctaLabel: resolvedCtaLabel,
      queryHint: resolvedQueryHint,
      copyPrompt: resolvedCopyPrompt,
      emailFieldMap: email_field_map?.trim() || null,
      triggerType: triggerTypeVal,
      triggerIntervalType: triggerTypeVal === "scheduled" ? trigger_interval_type?.trim() : null,
      triggerIntervalValue: triggerTypeVal === "scheduled" ? Number(trigger_interval_value) : null,
      enabled: enabled !== false,
    },
    include: {
      segment: { select: { id: true, name: true } },
      knowledgeBank: { select: { id: true, name: true } },
      emailTemplate: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
