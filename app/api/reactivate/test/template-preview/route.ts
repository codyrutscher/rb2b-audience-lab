import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { renderTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/reactivate/templates";
import { templateSlotsToEmailSlots } from "@/lib/reactivate/templates/slotsBridge";
import { isValidRecoveryType } from "@/lib/reactivate/recipes";
import {
  PRESET_IDS,
  PRESET_PREVIEW_HTML,
  PRESET_BODY_PLACEHOLDER,
  PRESET_FIRST_NAME_PLACEHOLDER,
} from "@/lib/reactivate/templates/preset-previews.generated";
import sanitizeHtml from "sanitize-html";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace {{VarName}} and [VarName] in text with values from variable_values (for preview testing). */
function substituteVariablePlaceholders(
  text: string,
  variableValues: Record<string, string> | null | undefined,
  firstName?: string
): string {
  let out = text;
  if (variableValues && typeof variableValues === "object") {
    for (const [key, val] of Object.entries(variableValues)) {
      if (!key || val == null) continue;
      const escaped = escapeRegex(key);
      const re1 = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi");
      const re2 = new RegExp(`\\[\\s*${escaped}\\s*\\]`, "gi");
      out = out.replace(re1, val).replace(re2, val);
    }
  }
  const nameVal = firstName ?? variableValues?.First_Name ?? variableValues?.first_name ?? "";
  if (nameVal) {
    out = out.replace(/\{\{\s*Reader's Name\s*\}\}/gi, nameVal).replace(/\[\s*Reader's Name\s*\]/gi, nameVal);
  }
  return out;
}

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
    variable_values,
  } = body;

  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=preview@example.com&account=${encodeURIComponent(accountId)}`;

  const firstName = first_name?.trim() || "there";
  const slots = {
    first_name: firstName,
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
    let bodyContent = (personalized_content ?? slots.personalized_content ?? "").toString().trim();
    bodyContent = substituteVariablePlaceholders(bodyContent, variable_values, firstName);
    if (bodyContent) {
      const safeBody = sanitizeHtml(bodyContent.replace(/\n/g, "<br/>"), {
        allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"],
        allowedAttributes: { a: ["href", "target", "rel"] },
        allowedSchemes: ["http", "https", "mailto"],
      });
      html = html.split(PRESET_BODY_PLACEHOLDER).join(safeBody);
    }
    html = html.split(PRESET_FIRST_NAME_PLACEHOLDER).join(firstName);
  } else if (recovery_type && isValidRecoveryType(recovery_type)) {
    let bodyContent = slots.personalized_content?.trim() || slots.personalized_content || "";
    bodyContent = substituteVariablePlaceholders(bodyContent, variable_values, firstName);
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
