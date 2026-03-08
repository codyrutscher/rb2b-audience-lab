import type { EmailSlots } from "../emailSlots";
import { getSlot, getSlotArray, escapeHtml } from "../emailSlots";

export function renderBenefitsListMjml(slots: EmailSlots): string {
  const sectionHeadline = escapeHtml(getSlot(slots, "section_headline", ""));
  const bullets = getSlotArray(slots, "bullets", 3);

  const bulletItems = bullets
    .map((b) => escapeHtml(b))
    .map((b) => `<li style="margin-bottom: 8px;">${b}</li>`)
    .join("");

  const headlineBlock = sectionHeadline
    ? `<mj-text font-size="18px" font-weight="600" color="#111827" padding="0 0 12px">${sectionHeadline}</mj-text>`
    : "";

  const listHtml = bulletItems || "<li>Key benefits from your content</li>";
  return `<mj-section padding="16px 20px"><mj-column width="100%">${headlineBlock}<mj-text font-size="16px" line-height="1.6" color="#374151"><ul style="margin: 0; padding-left: 20px;">${listHtml}</ul></mj-text></mj-column></mj-section>`;
}
