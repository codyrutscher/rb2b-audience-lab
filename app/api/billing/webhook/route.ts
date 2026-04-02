import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Safely read period dates — Stripe SDK moved these in newer API versions
function getPeriodDates(sub: any) {
  const item = sub.items?.data?.[0];
  const start = item?.current_period_start ?? sub.current_period_start;
  const end = item?.current_period_end ?? sub.current_period_end;
  return {
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { stripe } = await import("@/lib/stripe");

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        const plan = session.metadata?.plan || "pro";
        const subscriptionId = session.subscription as string;
        if (workspaceId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const { current_period_start, current_period_end } = getPeriodDates(sub);
          await supabase.from("subscriptions").upsert({
            workspace_id: workspaceId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            plan,
            status: "active",
            current_period_start,
            current_period_end,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "workspace_id" });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const { current_period_start, current_period_end } = getPeriodDates(sub);
          await supabase.from("subscriptions")
            .update({ status: "active", current_period_start, current_period_end, updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase.from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const { current_period_end } = getPeriodDates(sub);
        await supabase.from("subscriptions")
          .update({ status: sub.status, cancel_at_period_end: sub.cancel_at_period_end, current_period_end, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("subscriptions")
          .update({ plan: "free", status: "canceled", stripe_subscription_id: null, cancel_at_period_end: false, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
