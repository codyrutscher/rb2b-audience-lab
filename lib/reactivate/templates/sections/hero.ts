import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderHeroMjml(slots: EmailSlots): string {
  const headline = escapeHtml(getSlot(slots, "headline", "We have something for you"));
  const subheadline = escapeHtml(getSlot(slots, "subheadline", "")).replace(/\n/g, "<br/>");
  const heroImageUrl = getSlot(slots, "hero_image_url", "");
  const ctaText = escapeHtml(getSlot(slots, "cta_text", "Learn more"));
  const ctaUrl = getSlot(slots, "cta_url", "#");

  let imageBlock = "";
  if (heroImageUrl.trim()) {
    imageBlock = `<mj-image src="${escapeHtml(heroImageUrl)}" alt="" width="280px" padding-bottom="16px" />`;
  }

  let subBlock = "";
  if (subheadline) {
    subBlock = `<mj-text font-size="16px" line-height="1.5" color="#4b5563" padding="0 0 16px">${subheadline}</mj-text>`;
  }

  const hasCta = ctaUrl.trim() && ctaUrl !== "#";
  const ctaBlock = hasCta
    ? `<mj-button background-color="#6366f1" color="#ffffff" border-radius="6px" href="${escapeHtml(ctaUrl)}" padding="16px 0 0">${ctaText}</mj-button>`
    : "";

  return `<mj-section padding="20px 20px 8px"><mj-column width="100%">${imageBlock}<mj-text font-size="22px" font-weight="600" color="#111827" line-height="1.3">${headline}</mj-text>${subBlock}${ctaBlock}</mj-column></mj-section>`;
}
