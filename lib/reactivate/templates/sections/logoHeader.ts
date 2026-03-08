import type { EmailSlots } from "../emailSlots";
import { getSlot, escapeHtml } from "../emailSlots";

export function renderLogoHeaderMjml(slots: EmailSlots): string {
  const logoUrl = getSlot(slots, "logo_url", "");
  const brandName = escapeHtml(getSlot(slots, "brand_name", "Brand"));

  if (logoUrl.trim()) {
    return `
    <mj-section padding="24px 20px 16px">
      <mj-column width="100%">
        <mj-image src="${escapeHtml(logoUrl)}" alt="${brandName}" width="120px" />
      </mj-column>
    </mj-section>
    <mj-section padding="0 20px">
      <mj-column>
        <mj-divider border-color="#e5e7eb" border-width="1px" />
      </mj-column>
    </mj-section>
    `;
  }

  return `
  <mj-section padding="24px 20px 16px">
    <mj-column width="100%">
      <mj-text font-size="20px" font-weight="600" color="#111827">${brandName}</mj-text>
    </mj-column>
  </mj-section>
  <mj-section padding="0 20px">
    <mj-column>
      <mj-divider border-color="#e5e7eb" border-width="1px" />
    </mj-column>
  </mj-section>
  `;
}
