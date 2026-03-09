import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { renderTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/reactivate/templates";
import { templateSlotsToEmailSlots } from "@/lib/reactivate/templates/slotsBridge";
import { isValidRecoveryType } from "@/lib/reactivate/recipes";

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
  const { compilePreset, isValidPresetId, PRESET_METADATA } = await import(
    "@/lib/reactivate/templates/presets"
  );
  if (preset_id && isValidPresetId(preset_id)) {
    const bodyContent = slots.personalized_content?.trim() || slots.personalized_content || "";
    const presetMeta = PRESET_METADATA[preset_id];
    const emailSlots = {
      first_name: slots.first_name,
      body: bodyContent || "Add your message here. You can use AI to generate this from your knowledge base.",
      cta_text: slots.cta_label,
      cta_url: slots.cta_url,
      cta_label: slots.cta_label,
      unsubscribe_url: unsubscribeUrl,
      headline: headline?.trim() || presetMeta.subject,
      brand_name: brand_name?.trim() || "Your Company",
      subject: presetMeta.subject,
      logo_url: (slotDefaults?.logo_url ?? "")?.trim() || "",
      hero_image_url: (slotDefaults?.hero_image_url ?? "")?.trim() || "",
    };
    html = compilePreset(preset_id, emailSlots);
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
