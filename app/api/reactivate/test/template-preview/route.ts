import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { renderTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/reactivate/templates";
import { templateSlotsToEmailSlots } from "@/lib/reactivate/templates/slotsBridge";
import { isValidRecoveryType } from "@/lib/reactivate/recipes";
import {
  PRESET_IDS,
  PRESET_PREVIEW_HTML,
  PRESET_BODY_PLACEHOLDER,
} from "@/lib/reactivate/templates/preset-previews.generated";
import sanitizeHtml from "sanitize-html";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const accountId = await getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
  const {
    template_id,
    preset_id,
    recovery_type,
    slot_defaults,
    first_name,
    personalized_content,
    cta_url,
    cta_label,
    headline,
    brand_name,
  } = body;

  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=preview@example.com&account=${encodeURIComponent(accountId)}`;

  const slots = {
    first_name: first_name?.trim() || "there",
    personalized_content:
      personalized_content?.trim() ||
      "This is sample content. In real emails, this comes from the LLM based on retrieved knowledge.",
    cta_url: cta_url?.trim() || "https://example.com/product",
    cta_label: cta_label?.trim() || "Back to product",
    unsubscribe_url: unsubscribeUrl,
  };

  const slotDefaults = slot_defaults && typeof slot_defaults === "object" && !Array.isArray(slot_defaults)
    ? slot_defaults
    : null;

  let html: string;
  if (preset_id && PRESET_IDS.includes(preset_id as (typeof PRESET_IDS)[number])) {
    html = PRESET_PREVIEW_HTML[preset_id] ?? "";
    if (!html) {
      return NextResponse.json({ error: "Preset preview not found" }, { status: 404 });
    }
    const bodyContent = (personalized_content ?? slots.personalized_content ?? "").toString().trim();
    if (bodyContent) {
      const safeBody = sanitizeHtml(bodyContent.replace(/\n/g, "<br/>"), {
        allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"],
        allowedAttributes: { a: ["href", "target", "rel"] },
        allowedSchemes: ["http", "https", "mailto"],
      });
      html = html.split(PRESET_BODY_PLACEHOLDER).join(safeBody);
    }
  } else if (recovery_type && isValidRecoveryType(recovery_type)) {
    const bodyContent = slots.personalized_content?.trim() || slots.personalized_content || "";
    const emailSlots = templateSlotsToEmailSlots(
      slots,
      {
        body: bodyContent || "This is sample content. In real emails, this comes from the LLM based on retrieved knowledge.",
        cta_text: slots.cta_label,
        cta_url: slots.cta_url,
        unsubscribe_url: unsubscribeUrl,
      },
      slotDefaults
    );
    const { compileRecipe } = await import("@/lib/reactivate/templates/compiler");
    html = compileRecipe(recovery_type, emailSlots);
  } else {
    const templateId = (template_id?.trim() || "minimal_recovery") as TemplateId;
    if (!TEMPLATE_IDS.includes(templateId)) {
      return NextResponse.json(
        { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
        { status: 400 }
      );
    }
    html = renderTemplate(templateId, slots);
  }
  return NextResponse.json({ html });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[template-preview] error:", msg);
    return NextResponse.json(
      { error: "Template preview failed", detail: msg },
      { status: 500 }
    );
  }
}
