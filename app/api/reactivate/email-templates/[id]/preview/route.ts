import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { generateCopy } from "@/lib/reactivate/copyGeneration";
import { retrieveChunks } from "@/lib/reactivate/retrieval";
import { renderTemplate, type TemplateId } from "@/lib/reactivate/templates";
import { templateSlotsToEmailSlots } from "@/lib/reactivate/templates/slotsBridge";
import { isValidRecoveryType } from "@/lib/reactivate/recipes";
import { prisma } from "@/lib/reactivate/db";
import { substituteVariables } from "@/lib/reactivate/substituteVariables";

export const dynamic = "force-dynamic";

/**
 * POST /api/reactivate/email-templates/:id/preview
 * Generate copy from template's KB + prompt, render HTML. Body: { query } (for retrieval).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const template = await prisma.rtEmailTemplate.findFirst({
    where: { id, accountId },
    include: { knowledgeBank: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim() : (template.queryHint || "benefits and value");

  const chunks = await retrieveChunks({
    accountId,
    knowledgeBankId: template.knowledgeBankId,
    queryText: query,
    topK: 8,
  });
  const retrievedText =
    chunks.length > 0
      ? chunks.map((c) => c.text).join("\n\n")
      : template.knowledgeBank.description || "No relevant content found.";

  const copy = await generateCopy({
    retrievedText,
    firstName: "there",
    ctaLabel: template.ctaLabel ?? null,
    queryHint: template.queryHint ?? null,
    customPrompt: template.copyPrompt ?? null,
    maxNewTokens: 350,
  });

  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=preview@example.com&account=${encodeURIComponent(accountId)}`;

  const copyText = typeof copy === "string" ? copy : copy.copy;
  const slots = {
    first_name: "there",
    personalized_content: copyText,
    cta_url: template.ctaUrl || "https://example.com",
    cta_label: template.ctaLabel || "Learn more",
    unsubscribe_url: unsubscribeUrl,
  };

  let html: string;
  const recoveryType = template.recoveryType;
  if (recoveryType && isValidRecoveryType(recoveryType)) {
    const { compileRecipe } = await import("@/lib/reactivate/templates/compiler");
    const slotDefaults = template.slotDefaults as Record<string, unknown> | null;
    const emailSlots = templateSlotsToEmailSlots(
      slots,
      {
        subject: template.subjectTemplate,
        preheader: template.subjectTemplate,
        body: copyText,
        cta_text: template.ctaLabel || "Learn more",
        cta_url: template.ctaUrl || "https://example.com",
        unsubscribe_url: unsubscribeUrl,
      },
      slotDefaults
    );
    html = compileRecipe(recoveryType, emailSlots);
  } else {
    html = renderTemplate(template.templateId as TemplateId, slots);
  }

  const variableMappings = template.variableMappings as Record<string, string> | null;
  const sampleVariableValues = variableMappings
    ? Object.fromEntries(Object.keys(variableMappings).map((varName) => [varName, "Sample"]))
    : undefined;
  const subjectResolved = substituteVariables(template.subjectTemplate ?? "", {
    variableValues: sampleVariableValues,
    firstName: "there",
  });

  return NextResponse.json({
    copy,
    html,
    subject: subjectResolved.trim() || template.subjectTemplate,
    chunks_used: chunks.length,
  });
}
