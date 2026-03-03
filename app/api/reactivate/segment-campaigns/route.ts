import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";
import { TEMPLATE_IDS } from "@/lib/reactivate/templates";

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
    },
  });
  return NextResponse.json({ segment_campaigns: campaigns });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!segment_id || !knowledge_bank_id || !template_id || !subject_text) {
    return NextResponse.json(
      { error: "segment_id, knowledge_bank_id, template_id, and subject_text are required" },
      { status: 400 }
    );
  }
  if (!TEMPLATE_IDS.includes(template_id as (typeof TEMPLATE_IDS)[number])) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  const [segment, kb] = await Promise.all([
    prisma.rtSegment.findFirst({ where: { id: segment_id, accountId } }),
    prisma.rtKnowledgeBank.findFirst({ where: { id: knowledge_bank_id, accountId } }),
  ]);
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 400 });
  }
  if (!kb) {
    return NextResponse.json({ error: "Knowledge bank not found" }, { status: 400 });
  }
  const campaign = await prisma.rtSegmentCampaign.create({
    data: {
      accountId,
      segmentId: segment_id,
      knowledgeBankId: knowledge_bank_id,
      templateId: template_id,
      subjectText: subject_text,
      ctaUrl: cta_url ?? null,
      ctaLabel: cta_label ?? null,
      queryHint: query_hint ?? null,
      copyPrompt: copy_prompt !== undefined ? copy_prompt : null,
      enabled: enabled !== false,
    },
    include: {
      segment: { select: { id: true, name: true } },
      knowledgeBank: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
