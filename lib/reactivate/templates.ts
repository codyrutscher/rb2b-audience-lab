export const TEMPLATE_IDS = ["minimal_recovery"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateSlots {
  first_name: string;
  personalized_content: string;
  cta_url: string;
  cta_label: string;
  unsubscribe_url: string;
  [key: string]: string; // allow extra slots from pixel fields (company_name, job_title, etc.)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MINIMAL_RECOVERY_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.5;">
  <p>Hi {{first_name}},</p>
  <p>{{personalized_content}}</p>
  {{#if_cta}}
  <p><a href="{{cta_url}}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">{{cta_label}}</a></p>
  {{/if_cta}}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #6b7280;">
    You received this because you visited our site. <a href="{{unsubscribe_url}}">Unsubscribe</a> from these emails.
  </p>
</body>
</html>`;

export function renderTemplate(
  templateId: TemplateId,
  slots: TemplateSlots
): string {
  if (templateId !== "minimal_recovery") {
    throw new Error(`Unknown template: ${templateId}`);
  }

  let html = MINIMAL_RECOVERY_HTML;
  const safe = {
    first_name: escapeHtml(slots.first_name || "there"),
    personalized_content: escapeHtml(slots.personalized_content).replace(/\n/g, "<br>"),
    cta_url: escapeHtml(slots.cta_url || "#"),
    cta_label: escapeHtml(slots.cta_label || "Learn more"),
    unsubscribe_url: escapeHtml(slots.unsubscribe_url || "#"),
  };

  html = html.replace(/\{\{first_name\}\}/g, safe.first_name);
  html = html.replace(/\{\{personalized_content\}\}/g, safe.personalized_content);
  html = html.replace(/\{\{cta_url\}\}/g, safe.cta_url);
  html = html.replace(/\{\{cta_label\}\}/g, safe.cta_label);
  html = html.replace(/\{\{unsubscribe_url\}\}/g, safe.unsubscribe_url);
  // Replace extra slots (company_name, job_title, etc.)
  for (const [key, val] of Object.entries(slots)) {
    if (["first_name", "personalized_content", "cta_url", "cta_label", "unsubscribe_url"].includes(key)) continue;
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    html = html.replace(re, escapeHtml(val ?? ""));
  }

  const hasCta = !!(slots.cta_url?.trim());
  html = html.replace(/\{\{#if_cta\}\}([\s\S]*?)\{\{\/if_cta\}\}/g, hasCta ? "$1" : "");

  return html;
}
