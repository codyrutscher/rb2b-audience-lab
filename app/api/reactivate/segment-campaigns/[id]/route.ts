import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";
import { EMAIL_FIELD_MAP_OPTIONS } from "@/lib/reactivate/emailResolution";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const campaign = await prisma.rtSegmentCampaign.findFirst({
    where: { id, accountId },
    include: {
      segment: { select: { id: true, name: true, isSuppression: true } },
      knowledgeBank: { select: { id: true, name: true } },
      emailTemplate: { select: { id: true, name: true } },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Segment campaign not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
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
  const existing = await prisma.rtSegmentCampaign.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Segment campaign not found" }, { status: 404 });
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
  if (template_id && !TEMPLATE_IDS.includes(template_id as (typeof TEMPLATE_IDS)[number])) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof enabled === "boolean" && enabled === true) {
    const efm = email_field_map ?? existing.emailFieldMap;
    if (!efm?.trim() || !EMAIL_FIELD_MAP_OPTIONS.includes(efm.trim() as (typeof EMAIL_FIELD_MAP_OPTIONS)[number])) {
      return NextResponse.json(
        { error: "When enabling, email_field_map is required and must be one of: " + EMAIL_FIELD_MAP_OPTIONS.join(", ") },
        { status: 400 }
    );
    }
  }
  let updateData: Record<string, unknown> = {
    ...(segment_id && { segmentId: segment_id }),
    ...(template_id && { templateId: template_id }),
    ...(typeof subject_text === "string" && { subjectText: subject_text }),
    ...(typeof cta_url === "string" && { ctaUrl: cta_url }),
    ...(typeof cta_label === "string" && { ctaLabel: cta_label }),
    ...(typeof query_hint === "string" && { queryHint: query_hint }),
    ...(copy_prompt !== undefined && { copyPrompt: copy_prompt }),
    ...(typeof enabled === "boolean" && { enabled }),
    ...(email_field_map !== undefined && { emailFieldMap: email_field_map?.trim() || null }),
  };
  if (email_template_id !== undefined && email_template_id?.trim()) {
    const tpl = await prisma.rtEmailTemplate.findFirst({
      where: { id: email_template_id.trim(), accountId },
      select: { knowledgeBankId: true },
    });
    if (!tpl) {
      return NextResponse.json({ error: "email_template_id not found" }, { status: 404 });
    }
    updateData.emailTemplateId = email_template_id.trim();
    updateData.knowledgeBankId = tpl.knowledgeBankId;
  }
  if (trigger_type !== undefined) {
    const tv = trigger_type?.trim() || "on_segment_update";
    if (tv !== "on_segment_update" && tv !== "scheduled") {
      return NextResponse.json({ error: "trigger_type must be on_segment_update or scheduled" }, { status: 400 });
    }
    updateData.triggerType = tv;
    if (tv === "scheduled") {
      const it = trigger_interval_type?.trim();
      const iv = trigger_interval_value != null ? Number(trigger_interval_value) : NaN;
      if (!it || !["minutes", "hours", "days"].includes(it) || !Number.isInteger(iv) || iv < 1) {
        return NextResponse.json(
          { error: "When scheduled, trigger_interval_type and trigger_interval_value (≥1) are required" },
          { status: 400 }
        );
      }
      updateData.triggerIntervalType = it;
      updateData.triggerIntervalValue = iv;
    } else {
      updateData.triggerIntervalType = null;
      updateData.triggerIntervalValue = null;
    }
  }
  const campaign = await prisma.rtSegmentCampaign.update({
    where: { id },
    data: updateData as Parameters<typeof prisma.rtSegmentCampaign.update>[0]["data"],
    include: {
      segment: { select: { id: true, name: true } },
      knowledgeBank: { select: { id: true, name: true } },
      emailTemplate: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(campaign);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.rtSegmentCampaign.findFirst({
    where: { id, accountId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Segment campaign not found" }, { status: 404 });
  }
  await prisma.rtSegmentCampaign.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
