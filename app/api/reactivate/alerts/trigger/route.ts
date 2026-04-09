import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/reactivate/alerts/trigger
 * Called internally when events happen (visitor arrives, identified, etc.)
 * Checks all enabled alert rules and fires matching ones.
 * Body: { workspace_id, event_type, visitor }
 */
export async function POST(request: NextRequest) {
  try {
    const { workspace_id, event_type, visitor } = await request.json();
    if (!workspace_id || !event_type) {
      return NextResponse.json({ error: "workspace_id and event_type required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get all enabled alert rules for this workspace
    const { data: rules } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("enabled", true);

    if (!rules || rules.length === 0) {
      return NextResponse.json({ triggered: 0 });
    }

    let triggered = 0;

    for (const rule of rules) {
      const condType = rule.conditions?.type;
      let matches = false;

      // Check if the event matches the condition
      switch (condType) {
        case "visitor_identified":
          matches = event_type === "visitor_identified";
          break;
        case "visitor_arrived":
          matches = event_type === "visitor_arrived";
          break;
        case "page_views_threshold":
          matches = event_type === "page_view" && visitor?.page_views >= Number(rule.conditions?.value || 0);
          break;
        case "company_match":
          matches = visitor?.company?.toLowerCase().includes((rule.conditions?.value || "").toLowerCase());
          break;
        case "location_match": {
          const loc = `${visitor?.city || ""} ${visitor?.country || ""}`.toLowerCase();
          matches = loc.includes((rule.conditions?.value || "").toLowerCase());
          break;
        }
        case "utm_source_match":
          matches = visitor?.utm_source?.toLowerCase().includes((rule.conditions?.value || "").toLowerCase());
          break;
        case "lead_score_threshold":
          matches = (visitor?.lead_score || 0) >= Number(rule.conditions?.value || 0);
          break;
      }

      if (!matches) continue;

      // Fire the action
      const actionType = rule.actions?.type;
      const payload = {
        alert_name: rule.name,
        event_type,
        condition: rule.conditions,
        visitor: {
          name: visitor?.name,
          email: visitor?.email,
          company: visitor?.company,
          city: visitor?.city,
          country: visitor?.country,
          page_views: visitor?.page_views,
          utm_source: visitor?.utm_source,
        },
        triggered_at: new Date().toISOString(),
      };

      try {
        if (actionType === "slack" && rule.actions?.slack_webhook_url) {
          await fetch(rule.actions.slack_webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `🔔 *${rule.name}*\n${event_type.replace(/_/g, " ")} — ${visitor?.name || visitor?.email || "Unknown visitor"}${visitor?.company ? ` (${visitor.company})` : ""}`,
            }),
          });
          triggered++;
        } else if (actionType === "email" && rule.actions?.email_to) {
          // Use Resend if configured, otherwise log
          if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "alerts@audiencelab.io",
              to: rule.actions.email_to,
              subject: `Alert: ${rule.name}`,
              html: `<h2>🔔 ${rule.name}</h2><p><strong>Event:</strong> ${event_type.replace(/_/g, " ")}</p><p><strong>Visitor:</strong> ${visitor?.name || "Unknown"} ${visitor?.email ? `(${visitor.email})` : ""}</p>${visitor?.company ? `<p><strong>Company:</strong> ${visitor.company}</p>` : ""}<p><small>Triggered at ${new Date().toLocaleString()}</small></p>`,
            });
          }
          triggered++;
        } else if (actionType === "webhook" && rule.actions?.webhook_url) {
          await fetch(rule.actions.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          triggered++;
        }
      } catch (err) {
        console.error(`Alert "${rule.name}" failed to fire:`, err);
      }
    }

    return NextResponse.json({ triggered });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
