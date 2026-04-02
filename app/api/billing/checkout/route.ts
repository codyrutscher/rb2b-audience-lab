import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, PlanKey, STRIPE_ENABLED } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_ENABLED) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const { plan, userId } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json({ error: "plan and userId required" }, { status: 400 });
    }

    const planDef = PLANS[plan as PlanKey];
    if (!planDef || !planDef.priceId) {
      return NextResponse.json({ error: "Invalid plan or price not configured" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get workspace for this user
    const { data: uw } = await supabase
      .from("user_workspaces")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    const workspaceId = uw?.workspace_id;
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    // Check if workspace already has a Stripe customer
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    // Get user email for Stripe
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { workspace_id: workspaceId, user_id: userId },
      });
      customerId = customer.id;

      // Upsert subscription record with customer ID
      await supabase.from("subscriptions").upsert({
        workspace_id: workspaceId,
        stripe_customer_id: customerId,
        plan: "free",
        status: "active",
      }, { onConflict: "workspace_id" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planDef.priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: { workspace_id: workspaceId, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
