/**
 * Predefined high-converting email templates.
 * Adapted from open source (bbulakh/ecommerce-email, Mailteorite) for B2B retargeting.
 */

import fs from "node:fs";
import path from "node:path";
import mjml from "mjml";
import sanitizeHtml from "sanitize-html";
import type { EmailSlots } from "../emailSlots";

export const PRESET_IDS = [
  "browse_reminder",
  "product_interest",
  "reengagement",
] as const;

export type PresetTemplateId = (typeof PRESET_IDS)[number];

export const PRESET_METADATA: Record<
  PresetTemplateId,
  { name: string; description: string; subject: string }
> = {
  browse_reminder: {
    name: "Browse Reminder",
    description: "Gentle nudge for visitors who left without converting. Single CTA, low pressure.",
    subject: "You left something behind",
  },
  product_interest: {
    name: "Product Interest",
    description: "For visitors who viewed products or features. Benefits-focused, strong CTA.",
    subject: "Still thinking it over?",
  },
  reengagement: {
    name: "Re-engagement",
    description: "Win back inactive users. Warm tone, show what's new, give a reason to return.",
    subject: "We miss you",
  },
};

function getPresetPath(id: PresetTemplateId): string {
  const base = path.join(process.cwd(), "lib", "reactivate", "templates", "presets");
  const file = `${id.replace(/_/g, "-")}.mjml`;
  return path.join(base, file);
}

function loadPresetMjml(id: PresetTemplateId): string {
  const filePath = getPresetPath(id);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Preset template not found: ${id}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function mjmlToHtml(mjmlSource: string): string {
  const result = mjml(mjmlSource, { validationLevel: "soft", minify: false });
  return result.html;
}

function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Allowed HTML for email body: formatting only, no script/style. */
const BODY_ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li"];
const BODY_ALLOWED_ATTRS: Record<string, string[]> = { a: ["href", "target", "rel"] };

/** Convert markdown-style bold and italic to HTML (run before list conversion). */
function markdownInline(html: string): string {
  return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
}

/** Convert lines starting with - or * to <ul><li>; 1. 2. to <ol><li>. */
function markdownLists(text: string): string {
  const bulletMarker = /^\s*[-*]\s+(.+)$/;
  const numberMarker = /^\s*\d+\.\s+(.+)$/;
  const lines = text.split("\n");
  const out: string[] = [];
  let bulletItems: string[] = [];
  let numberItems: string[] = [];

  function flushBullet(): void {
    if (bulletItems.length === 0) return;
    out.push("<ul>" + bulletItems.map((c) => "<li>" + c + "</li>").join("") + "</ul>");
    bulletItems = [];
  }
  function flushNumber(): void {
    if (numberItems.length === 0) return;
    out.push("<ol>" + numberItems.map((c) => "<li>" + c + "</li>").join("") + "</ol>");
    numberItems = [];
  }

  for (const line of lines) {
    const bulletMatch = line.match(bulletMarker);
    const numberMatch = line.match(numberMarker);
    if (bulletMatch) {
      flushNumber();
      bulletItems.push(bulletMatch[1].trim());
    } else if (numberMatch) {
      flushBullet();
      numberItems.push(numberMatch[1].trim());
    } else {
      flushBullet();
      flushNumber();
      out.push(line);
    }
  }
  flushBullet();
  flushNumber();
  return out.join("\n");
}

function sanitizeEmailBody(html: string): string {
  const withMarkdown = markdownLists(markdownInline(html));
  const withBreaks = withMarkdown.replace(/\n/g, "<br/>");
  return sanitizeHtml(withBreaks, {
    allowedTags: BODY_ALLOWED_TAGS,
    allowedAttributes: BODY_ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/**
 * Replace placeholders in MJML with slot values.
 */
function applySlotsToMjml(mjml: string, slots: EmailSlots): string {
  const first_name = escapeForHtml(slots.first_name || "there");
  const rawBody = (slots.body || (slots as { personalized_content?: string }).personalized_content || "") as string;
  const body = sanitizeEmailBody(rawBody);
  const cta_url = escapeForHtml(slots.cta_url || "#");
  const cta_text = escapeForHtml(slots.cta_text || "Learn more");
  const unsubscribe_url = escapeForHtml(slots.unsubscribe_url || "#");
  const logoUrlRaw = (slots.logo_url || "").trim();
  const logo_url = escapeForHtml(slots.logo_url || "");
  const brand_name = escapeForHtml(slots.brand_name || "Your Company");
  const headline = escapeForHtml(slots.headline || "We have something for you");
  const subheadline = sanitizeEmailBody(slots.subheadline || "");
  const preview_text = escapeForHtml((slots.preheader || slots.subject || headline || "").slice(0, 130));
  const hero_image_url = (slots.hero_image_url || "").trim();

  const headerSlot =
    logoUrlRaw !== ""
      ? `<mj-image src="${logo_url}" alt="${brand_name}" width="120px" padding="0 0 12px" />`
      : `<mj-text font-size="14px" color="#6b7280" padding="0 0 8px">${brand_name}</mj-text>`;

  const heroImageSlot =
    hero_image_url !== ""
      ? `<mj-image src="${escapeForHtml(hero_image_url)}" alt="" width="100%" max-width="560px" padding="0 0 16px" fluid-on-mobile="true" />`
      : "";

  return mjml
    .replace(/__HEADER_SLOT__/g, headerSlot)
    .replace(/__HERO_IMAGE_SLOT__/g, heroImageSlot)
    .replace(/\{\{first_name\}\}/gi, first_name)
    .replace(/\{\{body\}\}/gi, body)
    .replace(/\{\{personalized_content\}\}/gi, body)
    .replace(/\{\{cta_url\}\}/gi, cta_url)
    .replace(/\{\{cta_text\}\}/gi, cta_text)
    .replace(/\{\{cta_label\}\}/gi, cta_text)
    .replace(/\{\{unsubscribe_url\}\}/gi, unsubscribe_url)
    .replace(/\{\{logo_url\}\}/gi, logo_url)
    .replace(/\{\{brand_name\}\}/gi, brand_name)
    .replace(/\{\{headline\}\}/gi, headline)
    .replace(/\{\{subheadline\}\}/gi, subheadline)
    .replace(/\{\{preview_text\}\}/gi, preview_text);
}

/**
 * Compile a preset template with slots to HTML.
 */
export function compilePreset(id: PresetTemplateId, slots: EmailSlots): string {
  const mjml = loadPresetMjml(id);
  const filled = applySlotsToMjml(mjml, slots);
  return mjmlToHtml(filled);
}

export function isValidPresetId(value: string): value is PresetTemplateId {
  return PRESET_IDS.includes(value as PresetTemplateId);
}
