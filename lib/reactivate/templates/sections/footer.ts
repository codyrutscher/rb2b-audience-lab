import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderFooterMjml(slots: EmailSlots): string {
  const companyAddress = escapeHtml(getSlot(slots, "company_address", ""));
  const unsubscribeUrl = getSlot(slots, "unsubscribe_url", "#");
  const preferencesUrl = getSlot(slots, "preferences_url", "");

  const addressBlock = companyAddress
    ? `<p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">${companyAddress}</p>`
    : "";

  const preferencesBlock = preferencesUrl
    ? ` <a href="${escapeHtml(preferencesUrl)}" style="color: #6366f1; text-decoration: none;">Manage preferences</a>`
    : "";

  return `
  <mj-section padding="24px 20px" background-color="#f9fafb">
    <mj-column width="100%">
      <mj-divider border-color="#e5e7eb" border-width="1px" padding-bottom="16px" />
      <mj-text font-size="12px" color="#6b7280" line-height="1.5">
        You received this because you visited our site.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
        from these emails.${preferencesBlock ? preferencesBlock : ""}
        ${addressBlock}
      </mj-text>
    </mj-column>
  </mj-section>
  `;
}
