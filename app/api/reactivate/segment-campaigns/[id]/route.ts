import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";

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
    knowledge_bank_id,
    template_id,
    subject_text,
    cta_url,
    cta_label,
    query_hint,
    copy_prompt,
    enabled,
  } = body;
  if (template_id && !TEMPLATE_IDS.includes(template_id as (typeof TEMPLATE_IDS)[number])) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  const campaign = await prisma.rtSegmentCampaign.update({
    where: { id },
    data: {
      ...(segment_id && { segmentId: segment_id }),
      ...(knowledge_bank_id && { knowledgeBankId: knowledge_bank_id }),
      ...(template_id && { templateId: template_id }),
      ...(typeof subject_text === "string" && { subjectText: subject_text }),
      ...(typeof cta_url === "string" && { ctaUrl: cta_url }),
      ...(typeof cta_label === "string" && { ctaLabel: cta_label }),
      ...(typeof query_hint === "string" && { queryHint: query_hint }),
      ...(copy_prompt !== undefined && { copyPrompt: copy_prompt }),
      ...(typeof enabled === "boolean" && { enabled }),
    },
    include: {
      segment: { select: { id: true, name: true } },
      knowledgeBank: { select: { id: true, name: true } },
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
