import type { EmailSlots } from "../emailSlots";
import { getSlot, getSlotArray, escapeHtml } from "../emailSlots";

export function renderObjectionBlockMjml(slots: EmailSlots): string {
  const headline = escapeHtml(getSlot(slots, "section_headline", "Common questions"));
  const bullets = getSlotArray(slots, "bullets", 3);
  const ctaText = escapeHtml(getSlot(slots, "cta_text", "Learn more"));
  const ctaUrl = getSlot(slots, "cta_url", "#");

  const bulletItems = bullets.length > 0
    ? bullets.map((b) => escapeHtml(b)).map((b) => `<li style="margin-bottom: 8px;">${b}</li>`).join("")
    : "<li>We&apos;re here to help.</li>";

  const hasCta = ctaUrl.trim() && ctaUrl !== "#";

  return `
  <mj-section padding="16px 20px">
    <mj-column width="100%">
      <mj-text font-size="18px" font-weight="600" color="#111827" padding="0 0 12px">${headline}</mj-text>
      <mj-text font-size="16px" line-height="1.6" color="#374151">
        <ul style="margin: 0; padding-left: 20px;">
          ${bulletItems}
        </ul>
      </mj-text>
      ${hasCta ? `
      <mj-button background-color="#6366f1" color="#ffffff" border-radius="6px" href="${escapeHtml(ctaUrl)}" padding="16px 0 0">
        ${ctaText}
      </mj-button>
      ` : ""}
    </mj-column>
  </mj-section>
  `;
}
