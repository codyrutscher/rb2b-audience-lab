import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { renderTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/reactivate/templates";

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    template_id,
    first_name,
    personalized_content,
    cta_url,
    cta_label,
  } = body;
  const templateId = (template_id?.trim() || "minimal_recovery") as TemplateId;
  if (!TEMPLATE_IDS.includes(templateId)) {
    return NextResponse.json(
      { error: `template_id must be one of: ${TEMPLATE_IDS.join(", ")}` },
      { status: 400 }
    );
  }
  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=preview@example.com&account=${encodeURIComponent(accountId)}`;
  const html = renderTemplate(templateId, {
    first_name: first_name?.trim() || "there",
    personalized_content:
      personalized_content?.trim() ||
      "This is sample content. In real emails, this comes from the LLM based on retrieved knowledge.",
    cta_url: cta_url?.trim() || "https://example.com/product",
    cta_label: cta_label?.trim() || "Back to product",
    unsubscribe_url: unsubscribeUrl,
  });
  return NextResponse.json({ html });
}
