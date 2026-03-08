import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderTestimonialMjml(slots: EmailSlots): string {
  const quote = escapeHtml(getSlot(slots, "testimonial_quote", "")).replace(/\n/g, "<br/>");
  const author = escapeHtml(getSlot(slots, "testimonial_author", ""));

  if (!quote.trim()) return "";

  const authorSuffix = author ? " — " + author : "";
  return `<mj-section padding="16px 20px" background-color="#f9fafb"><mj-column width="100%"><mj-text font-size="16px" line-height="1.6" color="#374151" font-style="italic">&ldquo;${quote}&rdquo;${authorSuffix}</mj-text></mj-column></mj-section>`;
}
