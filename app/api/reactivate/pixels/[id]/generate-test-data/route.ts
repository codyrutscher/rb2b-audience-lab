import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

const SAMPLE_CITIES = [
  { city: "New York", country: "United States" },
  { city: "Los Angeles", country: "United States" },
  { city: "Chicago", country: "United States" },
  { city: "London", country: "United Kingdom" },
  { city: "Paris", country: "France" },
  { city: "Tokyo", country: "Japan" },
  { city: "Sydney", country: "Australia" },
  { city: "Toronto", country: "Canada" },
];

const SAMPLE_COMPANIES = [
  "Acme Corp", "TechStart Inc", "Global Solutions", "Innovation Labs", 
  "Digital Ventures", "Cloud Systems", "Data Dynamics", "Smart Analytics"
];

const SAMPLE_NAMES = [
  { first: "John", last: "Smith", email: "john.smith" },
  { first: "Sarah", last: "Johnson", email: "sarah.johnson" },
  { first: "Michael", last: "Williams", email: "michael.williams" },
  { first: "Emily", last: "Brown", email: "emily.brown" },
  { first: "David", last: "Jones", email: "david.jones" },
  { first: "Jessica", last: "Garcia", email: "jessica.garcia" },
  { first: "Daniel", last: "Martinez", email: "daniel.martinez" },
  { first: "Ashley", last: "Davis", email: "ashley.davis" },
];

const SAMPLE_PAGES = [
  "/", "/pricing", "/features", "/about", "/contact", 
  "/blog", "/docs", "/demo", "/signup", "/login"
];

const DEVICES = ["desktop", "mobile", "tablet"];
const LANGUAGES = ["en-US", "en-GB", "fr-FR", "es-ES", "de-DE"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { id: pixelId } = await params;
  
  try {
    // Get account to find workspace_id
    const account = await prisma.rtAccount.findUnique({
      where: { id: accountId },
      select: { workspaceId: true },
    });
    
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify pixel exists and belongs to account
    const pixel = await prisma.rtPixel.findFirst({
      where: { id: pixelId, accountId },
    });
    
    if (!pixel) {
      return NextResponse.json({ error: "Pixel not found" }, { status: 404 });
    }

    const body = await request.json();
    const count = Math.min(body.count || 10, 50); // Max 50 test visitors

    const visitors = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const location = SAMPLE_CITIES[Math.floor(Math.random() * SAMPLE_CITIES.length)];
      const person = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const company = Math.random() > 0.3 ? SAMPLE_COMPANIES[Math.floor(Math.random() * SAMPLE_COMPANIES.length)] : null;
      const hasEmail = Math.random() > 0.4;
      const pageViews = Math.floor(Math.random() * 10) + 1;
      const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
      const language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
      const landingPage = pixel.websiteUrl + SAMPLE_PAGES[Math.floor(Math.random() * SAMPLE_PAGES.length)];
      
      const firstSeen = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const lastSeen = new Date(firstSeen.getTime() + Math.random() * (now.getTime() - firstSeen.getTime()));

      const visitor = {
        session_id: `test_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: account.workspaceId,
        pixel_id: pixelId,
        ip_address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: `Mozilla/5.0 (Test Agent ${i})`,
        city: location.city,
        country: location.country,
        company: company,
        email: hasEmail ? `${person.email}@${company?.toLowerCase().replace(/\s+/g, '') || 'example'}.com` : null,
        name: hasEmail ? `${person.first} ${person.last}` : null,
        page_views: pageViews,
        device_type: device,
        language: language,
        landing_page: landingPage,
        first_seen: firstSeen,
        last_seen: lastSeen,
        identified: hasEmail,
        is_returning: Math.random() > 0.6,
      };

      visitors.push(visitor);
    }

    // Insert visitors using raw SQL
    for (const v of visitors) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO visitors (
          session_id, workspace_id, pixel_id, ip_address, user_agent,
          city, country, company, email, name, page_views, device_type,
          language, landing_page, first_seen, last_seen, identified, is_returning
        ) VALUES (
          $1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
      `,
        v.session_id, v.workspace_id, v.pixel_id, v.ip_address, v.user_agent,
        v.city, v.country, v.company, v.email, v.name, v.page_views, v.device_type,
        v.language, v.landing_page, v.first_seen, v.last_seen, v.identified, v.is_returning
      );
    }

    // Trigger alerts for the generated visitors
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "http://localhost:3000";
    for (const v of visitors) {
      const eventType = v.identified ? "visitor_identified" : "visitor_arrived";
      try {
        await fetch(`${appUrl}/api/reactivate/alerts/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: account.workspaceId, event_type: eventType, visitor: v }),
        });
      } catch {}
    }

    return NextResponse.json({ 
      success: true, 
      count: visitors.length,
      message: `Generated ${visitors.length} test visitors for pixel ${pixel.name}`
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
