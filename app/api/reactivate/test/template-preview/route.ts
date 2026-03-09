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
  PRESET_HEADLINE_PLACEHOLDER,
  PRESET_SUBHEADING_PLACEHOLDER,
  PRESET_CTA_PLACEHOLDER,
  PRESET_BULLETS_PLACEHOLDER,
  PRESET_UNSUBSCRIBE_FOOTER_PLACEHOLDER,
} from "@/lib/reactivate/templates/preset-previews.generated";
import sanitizeHtml from "sanitize-html";

const SAFE_HTML_OPTS = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"] as string[],
  allowedAttributes: { a: ["href", "target", "rel"] as string[] },
  allowedSchemes: ["http", "https", "mailto"] as string[],
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ElementStyle = { fontSize?: string; color?: string; backgroundColor?: string };
const SAFE_SIZE = /^(\d+(?:\.\d+)?)(px|em|rem|%)?$/i;
const SAFE_COLOR = /^(#[\da-fA-F]{3,8}|rgb\s*\([^)]+\)|rgba\s*\([^)]+\)|[a-zA-Z]+)$/;
/** Inline style for text (no backgroundColor - that is applied to the CTA button separately). */
function inlineStyle(style: ElementStyle | null | undefined): string {
  if (!style || (style.fontSize == null && style.color == null)) return "";
  const parts: string[] = [];
  const fs = style.fontSize?.trim();
  if (fs && SAFE_SIZE.test(fs)) parts.push(`font-size: ${fs}`);
  const col = style.color?.trim();
  if (col && SAFE_COLOR.test(col)) parts.push(`color: ${col}`);
  return parts.length ? ` style="${parts.join("; ")}"` : "";
}
function wrapWithStyle(html: string, style: ElementStyle | null | undefined): string {
  const s = inlineStyle(style);
  return s ? `<span${s}>${html}</span>` : html;
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
    subheading,
    bullets: bulletsArr,
    cta,
    brand_name,
    unsubscribe_footer: unsubscribeFooterInput,
    variable_values,
    style: styleInput,
  } = body;

  const style = styleInput && typeof styleInput === "object" && !Array.isArray(styleInput) ? styleInput as Record<string, ElementStyle> : null;

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
      const safeBody = sanitizeHtml(bodyContent.replace(/\n/g, "<br/>"), SAFE_HTML_OPTS);
      html = html.split(PRESET_BODY_PLACEHOLDER).join(safeBody);
    }
    html = html.split(PRESET_FIRST_NAME_PLACEHOLDER).join(firstName);
    const structuredHeadline = (headline ?? "").toString().trim();
    const structuredSubheading = (subheading ?? "").toString().trim();
    const structuredCta = (cta ?? cta_label ?? "").toString().trim();
    const headlineStyle = style?.headline;
    const subheadingStyle = style?.subheading;
    const bulletStyle = style?.bullet;
    const ctaStyle = style?.cta;
    if (structuredHeadline) html = html.split(PRESET_HEADLINE_PLACEHOLDER).join(wrapWithStyle(sanitizeHtml(structuredHeadline, SAFE_HTML_OPTS), headlineStyle));
    if (structuredSubheading) html = html.split(PRESET_SUBHEADING_PLACEHOLDER).join(wrapWithStyle(sanitizeHtml(structuredSubheading.replace(/\n/g, "<br/>"), SAFE_HTML_OPTS), subheadingStyle));
    if (structuredCta) html = html.split(PRESET_CTA_PLACEHOLDER).join(wrapWithStyle(sanitizeHtml(structuredCta, SAFE_HTML_OPTS), ctaStyle));
    if (ctaStyle?.backgroundColor?.trim() && SAFE_COLOR.test(ctaStyle.backgroundColor.trim())) {
      const ctaBg = ctaStyle.backgroundColor.trim();
      html = html.replace(/bgcolor="#6366f1"/g, `bgcolor="${ctaBg}"`);
      html = html.replace(/background:#6366f1/g, `background:${ctaBg}`);
    }
    if (ctaStyle?.color?.trim() && SAFE_COLOR.test(ctaStyle.color.trim())) {
      html = html.replace(/color:#ffffff(?!\d)/g, `color:${ctaStyle.color!.trim()}`);
    }
    const defaultUnsubscribeFooter =
      `You received this because you visited our site. <a href="${unsubscribeUrl}" color="#6366f1">Unsubscribe</a> from these emails.`;
    const unsubscribeFooterRaw =
      (typeof unsubscribeFooterInput === "string" && unsubscribeFooterInput.trim()) || defaultUnsubscribeFooter;
    const unsubscribeFooterHtml = sanitizeHtml(
      unsubscribeFooterRaw.replace(/\{\{unsubscribe_url\}\}/gi, unsubscribeUrl),
      SAFE_HTML_OPTS
    );
    html = html.split(PRESET_UNSUBSCRIBE_FOOTER_PLACEHOLDER).join(unsubscribeFooterHtml);

    const bullets = Array.isArray(bulletsArr) ? bulletsArr.filter((b) => b != null && String(b).trim()) : [];
    if (bullets.length > 0) {
      const bulletParts = bullets.map((b) => wrapWithStyle(sanitizeHtml(String(b).replace(/\n/g, "<br/>"), SAFE_HTML_OPTS), bulletStyle));
      const listItems = bulletParts.map((part) => `<li style="margin-bottom: 6px;">${part}</li>`).join("");
      const bulletsBlock = `<ul style="list-style-type: disc; padding-left: 20px; margin: 0 0 16px 0;">${listItems}</ul>`;
      const bulletsPattern = new RegExp(`<ul>\\s*<li>\\s*${escapeRegex(PRESET_BULLETS_PLACEHOLDER)}\\s*</li>\\s*</ul>`);
      html = html.replace(bulletsPattern, bulletsBlock);
    }
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
