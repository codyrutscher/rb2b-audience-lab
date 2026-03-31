import { NextRequest, NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import { prisma } from "@/lib/reactivate/db";

// ---------------------------------------------------------------------------
// Lightweight connection testers per platform
// Each returns { ok, error? } after hitting the platform's API.
// ---------------------------------------------------------------------------
async function testConnection(platform: string, config: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (platform) {
      // --- Email Marketing ---
      case "klaviyo": {
        const res = await fetch("https://a.klaviyo.com/api/lists", {
          headers: { Authorization: `Klaviyo-API-Key ${config.apiKey}`, revision: "2024-02-15" },
        });
        if (!res.ok) return { ok: false, error: `Klaviyo returned ${res.status}: ${res.statusText}. Check your Private API Key.` };
        return { ok: true };
      }
      case "mailchimp": {
        const dc = config.apiKey?.split("-").pop() || "us21";
        const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `Mailchimp returned ${res.status}. Verify your API key and data center suffix (e.g. -us21).` };
        return { ok: true };
      }
      case "sendgrid": {
        const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `SendGrid returned ${res.status}: ${res.statusText}. Check your API Key.` };
        return { ok: true };
      }
      case "activecampaign": {
        const url = config.apiUrl?.replace(/\/+$/, "");
        const res = await fetch(`${url}/api/3/users/me`, {
          headers: { "Api-Token": config.apiKey },
        });
        if (!res.ok) return { ok: false, error: `ActiveCampaign returned ${res.status}. Verify your API URL and API Key.` };
        return { ok: true };
      }
      case "convertkit": {
        const res = await fetch(`https://api.convertkit.com/v3/account?api_key=${config.apiKey}`);
        if (!res.ok) return { ok: false, error: `ConvertKit returned ${res.status}. Check your API Key.` };
        return { ok: true };
      }
      case "brevo": {
        const res = await fetch("https://api.brevo.com/v3/account", {
          headers: { "api-key": config.apiKey },
        });
        if (!res.ok) return { ok: false, error: `Brevo returned ${res.status}. Check your API Key.` };
        return { ok: true };
      }
      case "drip": {
        const res = await fetch(`https://api.getdrip.com/v2/${config.accountId}/accounts`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `Drip returned ${res.status}. Verify your API Token and Account ID.` };
        return { ok: true };
      }

      // --- CRMs ---
      case "hubspot": {
        const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `HubSpot returned ${res.status}: ${res.statusText}. Check your Private App Token.` };
        return { ok: true };
      }
      case "salesforce": {
        const url = config.instanceUrl?.replace(/\/+$/, "");
        const res = await fetch(`${url}/services/data/v59.0/limits`, {
          headers: { Authorization: `Bearer ${config.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `Salesforce returned ${res.status}. Verify your Instance URL and Access Token.` };
        return { ok: true };
      }
      case "pipedrive": {
        const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${config.apiKey}`);
        if (!res.ok) return { ok: false, error: `Pipedrive returned ${res.status}. Check your API Token.` };
        return { ok: true };
      }
      case "zoho_crm": {
        const res = await fetch("https://www.zohoapis.com/crm/v2/users?type=CurrentUser", {
          headers: { Authorization: `Zoho-oauthtoken ${config.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `Zoho CRM returned ${res.status}. Your access token may be expired.` };
        return { ok: true };
      }
      case "close": {
        const res = await fetch("https://api.close.com/api/v1/me/", {
          headers: { Authorization: `Basic ${Buffer.from(config.apiKey + ":").toString("base64")}` },
        });
        if (!res.ok) return { ok: false, error: `Close CRM returned ${res.status}. Check your API Key.` };
        return { ok: true };
      }
      case "copper": {
        const res = await fetch("https://api.copper.com/developer_api/v1/account", {
          method: "GET",
          headers: {
            "X-PW-AccessToken": config.apiKey,
            "X-PW-UserEmail": config.email,
            "X-PW-Application": "developer_api",
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) return { ok: false, error: `Copper returned ${res.status}. Verify your API Key and User Email.` };
        return { ok: true };
      }

      // --- Messaging / Webhooks ---
      case "slack":
      case "discord":
      case "microsoft_teams":
      case "zapier":
      case "make":
      case "n8n":
      case "webhook": {
        const url = config.webhookUrl;
        if (!url) return { ok: false, error: "Webhook URL is required." };
        try {
          new URL(url);
        } catch {
          return { ok: false, error: `Invalid URL format: "${url}". Must start with https://` };
        }
        if (!url.startsWith("https://")) {
          return { ok: false, error: "Webhook URL must use HTTPS." };
        }
        // Send a test ping
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true, source: "audiencelab", message: "Connection test from Audience Lab" }),
        });
        if (!res.ok) return { ok: false, error: `Webhook returned ${res.status}: ${res.statusText}. Verify the URL is correct and accepting POST requests.` };
        return { ok: true };
      }

      // --- Advertising (token format validation only — full OAuth is out of scope) ---
      case "facebook_ads":
      case "google_ads":
      case "linkedin_ads":
      case "tiktok_ads": {
        const token = config.accessToken || config.developerToken;
        if (!token || token.length < 10) return { ok: false, error: "Token looks too short. Please paste the full access/developer token." };
        return { ok: true };
      }

      // --- Spreadsheets ---
      case "google_sheets": {
        if (!config.sheetId || config.sheetId.length < 10) return { ok: false, error: "Sheet ID looks invalid. Copy it from the Google Sheets URL." };
        return { ok: true };
      }
      case "airtable": {
        const res = await fetch(`https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableId)}?maxRecords=1`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) return { ok: false, error: `Airtable returned ${res.status}. Verify your Personal Access Token, Base ID, and Table Name.` };
        return { ok: true };
      }

      // --- Analytics ---
      case "segment_io":
      case "mixpanel":
      case "amplitude": {
        const key = config.writeKey || config.token || config.apiKey;
        if (!key || key.length < 5) return { ok: false, error: "API key/token looks too short. Please paste the full value." };
        return { ok: true };
      }

      default:
        return { ok: true }; // Unknown platform — skip test
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Network-level errors (DNS, timeout, refused, etc.)
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
      return { ok: false, error: `Could not reach the server. Check the URL or try again later. (${msg})` };
    }
    return { ok: false, error: `Connection test failed: ${msg}` };
  }
}

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.rtIntegration.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ integrations });
}

export async function POST(request: NextRequest) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, platform, config } = body;

  if (!name || !platform) {
    return NextResponse.json({ error: "name and platform required" }, { status: 400 });
  }

  // Test the connection first
  const test = await testConnection(platform, config || {});
  if (!test.ok) {
    return NextResponse.json(
      { error: test.error || "Connection test failed", connectionError: true },
      { status: 422 }
    );
  }

  const integration = await prisma.rtIntegration.create({
    data: {
      accountId,
      name,
      platform,
      config: config || {},
    },
  });

  return NextResponse.json(integration, { status: 201 });
}
