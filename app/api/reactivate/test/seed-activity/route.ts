/**
 * POST /api/reactivate/test/seed-activity
 * Seeds test activity_feed events and page_views for the current workspace.
 * Generates page_view, button_clicked, form_submitted events.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const PAGES = [
  { url: "/", title: "Home" },
  { url: "/pricing", title: "Pricing" },
  { url: "/features", title: "Features" },
  { url: "/about", title: "About Us" },
  { url: "/blog", title: "Blog" },
  { url: "/contact", title: "Contact" },
  { url: "/docs", title: "Documentation" },
  { url: "/demo", title: "Request Demo" },
];

const BUTTONS = [
  { text: "Get Started", id: "cta-hero" },
  { text: "Sign Up Free", id: "cta-signup" },
  { text: "Learn More", id: "cta-learn" },
  { text: "View Pricing", id: "cta-pricing" },
  { text: "Download PDF", id: "btn-download" },
  { text: "Watch Video", id: "btn-video" },
];

const FORMS = [
  { name: "Contact Form", id: "contact-form" },
  { name: "Newsletter Signup", id: "newsletter-form" },
  { name: "Demo Request", id: "demo-form" },
  { name: "Free Trial", id: "trial-form" },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get workspace_id from account
    const account = await prisma.rtAccount.findUnique({
      where: { id: accountId },
      select: { workspaceId: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const workspaceId = account.workspaceId;

    // Get existing visitors for this workspace
    const visitors = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, session_id FROM visitors WHERE workspace_id = $1::uuid LIMIT 50`,
      workspaceId
    );

    if (visitors.length === 0) {
      return NextResponse.json(
        { error: "No visitors found. Generate test data for a pixel first." },
        { status: 400 }
      );
    }

    let activityCount = 0;
    let pageViewCount = 0;

    // Generate page_view events in activity_feed + page_views table
    for (let i = 0; i < 40; i++) {
      const visitor = randomItem(visitors);
      const page = randomItem(PAGES);
      const ts = randomDate(7);
      const timeOnPage = Math.floor(Math.random() * 300) + 5;

      // Insert into activity_feed
      await prisma.$queryRawUnsafe(
        `INSERT INTO activity_feed (workspace_id, visitor_id, activity_type, title, description, metadata, timestamp)
         VALUES ($1::uuid, $2::uuid, 'page_view', $3, $4, $5::jsonb, $6)`,
        workspaceId,
        visitor.id,
        `${visitor.name || 'Visitor'} viewed ${page.title}`,
        page.url,
        JSON.stringify({ url: page.url, title: page.title, time_on_page: timeOnPage }),
        ts
      );
      activityCount++;

      // Insert into page_views table
      await prisma.$queryRawUnsafe(
        `INSERT INTO page_views (visitor_id, session_id, url, title, referrer, timestamp, duration)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
        visitor.id,
        visitor.session_id || `session-${Math.random().toString(36).slice(2, 10)}`,
        page.url,
        page.title,
        randomItem(["https://google.com", "https://twitter.com", "direct", "", "https://linkedin.com"]),
        ts,
        timeOnPage
      );
      pageViewCount++;
    }

    // Generate button_clicked events
    for (let i = 0; i < 15; i++) {
      const visitor = randomItem(visitors);
      const btn = randomItem(BUTTONS);
      const ts = randomDate(7);

      await prisma.$queryRawUnsafe(
        `INSERT INTO activity_feed (workspace_id, visitor_id, activity_type, title, description, metadata, timestamp)
         VALUES ($1::uuid, $2::uuid, 'button_clicked', $3, $4, $5::jsonb, $6)`,
        workspaceId,
        visitor.id,
        `${visitor.name || 'Visitor'} clicked "${btn.text}"`,
        `Button: ${btn.text}`,
        JSON.stringify({ element_id: btn.id, element_text: btn.text, page: randomItem(PAGES).url }),
        ts
      );
      activityCount++;
    }

    // Generate form_submitted events
    for (let i = 0; i < 10; i++) {
      const visitor = randomItem(visitors);
      const form = randomItem(FORMS);
      const ts = randomDate(7);

      await prisma.$queryRawUnsafe(
        `INSERT INTO activity_feed (workspace_id, visitor_id, activity_type, title, description, metadata, timestamp)
         VALUES ($1::uuid, $2::uuid, 'form_submitted', $3, $4, $5::jsonb, $6)`,
        workspaceId,
        visitor.id,
        `${visitor.name || 'Visitor'} submitted ${form.name}`,
        `Form: ${form.name}`,
        JSON.stringify({ form_id: form.id, form_name: form.name, page: randomItem(PAGES).url }),
        ts
      );
      activityCount++;
    }

    return NextResponse.json({
      ok: true,
      activityEventsCreated: activityCount,
      pageViewsCreated: pageViewCount,
      visitorsUsed: visitors.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
