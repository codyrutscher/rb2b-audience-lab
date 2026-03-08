import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderSurveyCtaMjml(slots: EmailSlots): string {
  const body = escapeHtml(getSlot(slots, "body", "")).replace(/\n/g, "<br/>");
  const ctaText = escapeHtml(getSlot(slots, "cta_text", "Continue"));
  const ctaUrl = getSlot(slots, "cta_url", "#");

  return `
  <mj-section padding="16px 20px">
    <mj-column width="100%">
      ${body ? `<mj-text font-size="16px" line-height="1.6" color="#374151" padding="0 0 16px">${body}</mj-text>` : ""}
      <mj-button background-color="#6366f1" color="#ffffff" border-radius="6px" href="${escapeHtml(ctaUrl || "#")}">
        ${ctaText}
      </mj-button>
    </mj-column>
  </mj-section>
  `;
}
