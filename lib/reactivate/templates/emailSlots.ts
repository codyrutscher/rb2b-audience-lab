/**
 * Slot schema for modular recovery email templates.
 * Maps to section inputs per email_templates.md.
 */

export interface EmailSlots {
  subject?: string;
  preheader?: string;
  headline?: string;
  subheadline?: string;
  body?: string;
  bullets?: string[];
  testimonial_quote?: string;
  testimonial_author?: string;
  cta_text?: string;
  cta_url?: string;
  secondary_cta_text?: string;
  secondary_cta_url?: string;
  offer_text?: string;
  logo_url?: string;
  brand_name?: string;
  company_address?: string;
  unsubscribe_url?: string;
  preferences_url?: string;
  first_name?: string;
  hero_image_url?: string;
  section_headline?: string;
  [key: string]: string | string[] | undefined;
}

/** Escape for safe use in HTML/MJML text content */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getSlot(slots: EmailSlots, key: string, fallback = ""): string {
  const v = slots[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
  return fallback;
}

export function getSlotArray(slots: EmailSlots, key: string, max = 3): string[] {
  const v = slots[key];
  if (Array.isArray(v)) return v.slice(0, max).filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v].slice(0, max);
  return [];
}
