import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { renderTemplate, TEMPLATE_IDS, type TemplateId } from "@/lib/reactivate/templates";
import { sendEmail } from "@/lib/reactivate/resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const {
    to,
    template_id,
    first_name,
    personalized_content,
    cta_url,
    cta_label,
    subject,
  } = body;

  const toEmail = typeof to === "string" ? to.trim() : "";
  if (!toEmail || !EMAIL_REGEX.test(toEmail)) {
    return NextResponse.json(
      { error: "Valid 'to' email address is required" },
      { status: 400 }
    );
  }

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
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=${encodeURIComponent(toEmail)}&account=${encodeURIComponent(accountId)}`;

  const html = renderTemplate(templateId, {
    first_name: first_name?.trim() || "there",
    personalized_content:
      personalized_content?.trim() ||
      "This is a test email from Reactivate.",
    cta_url: cta_url?.trim() || "https://example.com",
    cta_label: cta_label?.trim() || "Back to site",
    unsubscribe_url: unsubscribeUrl,
  });

  const emailSubject =
    typeof subject === "string" && subject.trim()
      ? subject.trim()
      : "Test email – Reactivate";

  try {
    const { messageId, error } = await sendEmail({
      to: toEmail,
      subject: emailSubject,
      html,
    });
    if (error) {
      return NextResponse.json(
        { error: "Failed to send test email", detail: error },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to send test email", detail: message },
      { status: 500 }
    );
  }
}
