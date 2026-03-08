import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { compilePreset, isValidPresetId, PRESET_METADATA } from "@/lib/reactivate/templates/presets";

/**
 * GET /api/reactivate/preset-templates/:id/preview
 * Returns rendered HTML for the preset template with sample content (wireframe preview).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidPresetId(id)) {
    return NextResponse.json({ error: "Invalid preset id" }, { status: 400 });
  }

  const meta = PRESET_METADATA[id];
  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const unsubscribeUrl = `${base.replace(/\/$/, "")}/api/reactivate/unsubscribe?email=preview@example.com&account=${encodeURIComponent(accountId)}`;

  const sampleByPreset: Record<string, { body: string; subheadline?: string }> = {
    browse_reminder: {
      body: "You were looking at something on our site — we saved your place. Come back anytime; no pressure. If you have questions, just reply to this email.",
    },
    product_interest: {
      subheadline: "Quick recap of why visitors love this product",
      body: "Here’s a quick recap of what you looked at and why it’s a good fit. Key benefits: simple setup, great support, and results you can measure. Ready to pick up where you left off?",
    },
    reengagement: {
      body: "We haven’t seen you in a while and wanted to say hi. A few things have changed: new features, better pricing, and the same team here to help. We’d love to have you back.",
    },
  };
  const sample = sampleByPreset[id] ?? {
    body: "Your personalized message will appear here. Generate with AI from your knowledge base or write it manually.",
  };

  const sampleSlots = {
    first_name: "there",
    body: sample.body,
    subheadline: sample.subheadline ?? "",
    cta_text: "Back to site",
    cta_url: "https://example.com",
    cta_label: "Back to site",
    unsubscribe_url: unsubscribeUrl,
    headline: meta.subject,
    brand_name: "Your Company",
    subject: meta.subject,
  };

  try {
    const html = compilePreset(id, sampleSlots);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[preset-preview] error:", msg);
    return NextResponse.json({ error: "Preview failed", detail: msg }, { status: 500 });
  }
}
