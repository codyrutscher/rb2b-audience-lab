import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderIntroTextMjml(slots: EmailSlots): string {
  const body = escapeHtml(getSlot(slots, "body", "")).replace(/\n/g, "<br/>");
  if (!body.trim()) return "";
  return `<mj-section padding="16px 20px"><mj-column width="100%"><mj-text font-size="16px" line-height="1.6" color="#374151">${body}</mj-text></mj-column></mj-section>`;
}
