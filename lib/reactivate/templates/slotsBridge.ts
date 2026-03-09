import type { TemplateSlots } from "../templates";
import type { EmailSlots } from "./emailSlots";

const CUSTOMIZABLE_KEYS = [
  "logo_url", "brand_name", "headline", "subheadline", "company_address",
  "hero_image_url", "cta_text", "cta_url", "preheader", "section_headline",
  "testimonial_quote", "testimonial_author", "bullets",
];

/** Merge slot_defaults (from template) into base. Only customizable keys; never overwrite body/first_name. */
export function mergeSlotDefaults(
  base: EmailSlots,
  defaults?: Record<string, unknown> | null
): EmailSlots {
  if (!defaults || typeof defaults !== "object") return base;
  const merged = { ...base };
  for (const [key, val] of Object.entries(defaults)) {
    if (!CUSTOMIZABLE_KEYS.includes(key)) continue;
    if (val == null) continue;
    // Don't overwrite subheadline with empty, or with content that looks like full body (avoids duplication with intro_text)
    if (typeof val === "string") {
      if (key === "subheadline" && (val.trim() === "" || val.length > 200 || /Dear\s+\[?Name\]?|Subject\s*:/i.test(val))) continue;
      merged[key] = val;
    }
    if (Array.isArray(val) && val.some((x) => typeof x === "string")) {
      const filtered = val.filter((x): x is string => typeof x === "string");
      // Reject bullets that look like full body copy (avoids duplication with intro_text)
      if (key === "bullets" && filtered.some((b) => b.length > 400 || /Dear\s+\[?Name\]?|Subject\s*:/i.test(b))) continue;
      merged[key] = filtered;
    }
  }
  return merged;
}

/**
 * Convert TemplateSlots (legacy) to EmailSlots for recipe compiler.
 * Merges slot_defaults when provided.
 */
export function templateSlotsToEmailSlots(
  slots: TemplateSlots,
  overrides?: Partial<EmailSlots>,
  slotDefaults?: Record<string, unknown> | null
): EmailSlots {
  const firstName = slots.first_name || "there";
  const body = (slots.personalized_content || "").toString().trim();

  const base: EmailSlots = {
    first_name: firstName,
    headline: "We have something for you",
    subheadline: "",
    body: body || `Hi ${firstName},`,
    cta_text: slots.cta_label || "Learn more",
    cta_url: slots.cta_url || "",
    unsubscribe_url: slots.unsubscribe_url || "#",
    company_address: "",
    ...overrides,
    ...Object.fromEntries(
      Object.entries(slots).filter(
        ([k]) => !["first_name", "personalized_content", "cta_url", "cta_label", "unsubscribe_url"].includes(k)
      )
    ),
  };

  return mergeSlotDefaults(base, slotDefaults);
}
