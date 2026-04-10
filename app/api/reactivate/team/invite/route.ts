import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieList = cookieHeader.split(";").map((c) => {
    const [name, ...v] = c.trim().split("=");
    return { name: name?.trim() ?? "", value: v.join("=").trim() };
  }).filter((c) => c.name);

  let list = cookieList;
  if (list.length === 0) {
    const store = await cookies();
    list = store.getAll();
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => list, setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const supabase = getServiceSupabase();

  // Get workspace for this user
  const { data: uw } = await supabase
    .from("user_workspaces")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!uw?.workspace_id) {
    return NextResponse.json({ error: "No workspace found for your account" }, { status: 404 });
  }

  const workspaceId = uw.workspace_id;

  // Check if already invited
  const { data: existing } = await supabase
    .from("team_invitations")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("email", email.trim())
    .eq("status", "pending")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This email already has a pending invitation" }, { status: 409 });
  }

  // Insert invitation
  const { data: invitation, error: insertError } = await supabase
    .from("team_invitations")
    .insert({
      workspace_id: workspaceId,
      email: email.trim(),
      role: role || "member",
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rb2b-audience-lab-l5h8.vercel.app";

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@audiencelab.io",
        to: email.trim(),
        subject: "You've been invited to join Audience Lab",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #111827; margin-bottom: 8px;">You've been invited!</h2>
            <p style="color: #4b5563; margin-bottom: 24px;">
              You've been invited to join a workspace on <strong>Audience Lab</strong> as a <strong>${role || "member"}</strong>.
            </p>
            <a href="${appUrl}/signup" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Accept Invitation
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send invitation email:", emailErr);
      // Don't fail the request — invitation is saved, email is best-effort
    }
  }

  return NextResponse.json({ ok: true, invitation });
}
