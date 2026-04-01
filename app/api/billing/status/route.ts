import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: uw } = await supabase
      .from("user_workspaces")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!uw?.workspace_id) {
      return NextResponse.json({ plan: "free", status: "active" });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", uw.workspace_id)
      .limit(1)
      .single();

    if (!sub) {
      return NextResponse.json({ plan: "free", status: "active" });
    }

    return NextResponse.json({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      hasStripeCustomer: !!sub.stripe_customer_id,
    });
  } catch (err) {
    return NextResponse.json({ plan: "free", status: "active" });
  }
}
