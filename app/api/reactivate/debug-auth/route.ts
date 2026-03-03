import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/reactivate/db";

function parseCookieHeader(cookieHeader: string | null): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((part) => {
      const [name, ...v] = part.trim().split("=");
      return { name: name?.trim() ?? "", value: v.join("=").trim() };
    })
    .filter((c) => c.name);
}

/**
 * GET /api/reactivate/debug-auth
 * Call with same credentials as the Reactivate page (e.g. from browser while logged in).
 * Returns where auth fails; no secrets in response.
 */
export async function GET(request: Request) {
  const steps: Record<string, unknown> = {};
  const cookieHeader = request?.headers?.get?.("cookie") ?? null;
  const fromHeader = parseCookieHeader(cookieHeader);
  steps["1_cookie_header"] =
    cookieHeader === null
      ? "null"
      : { count: fromHeader.length, names: fromHeader.map((c) => c.name) };

  let cookieList = fromHeader;
  if (cookieList.length === 0) {
    const store = await cookies();
    cookieList = store.getAll();
    steps["2_next_headers_cookies"] = { count: cookieList.length, names: cookieList.map((c) => c.name) };
  } else {
    steps["2_next_headers_cookies"] = "skipped (had header)";
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieList,
        setAll: () => {},
      },
    }
  );

  const { data: sessionData } = await supabase.auth.getSession();
  steps["3_getSession"] = sessionData?.session
    ? { hasSession: true, userId: sessionData.session.user?.id }
    : { hasSession: false, error: "no session" };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  steps["4_getUser"] = userData?.user
    ? { hasUser: true, userId: userData.user.id }
    : { hasUser: false, error: userError?.message ?? "no user" };

  if (!userData?.user) {
    return NextResponse.json({ ok: false, steps }, { status: 200 });
  }

  const uw = await prisma.$queryRaw<{ workspace_id: string }[]>`
    SELECT workspace_id FROM user_workspaces WHERE user_id::text = ${userData.user.id} LIMIT 1
  `.catch((e) => {
    steps["5_workspace_error"] = String(e);
    return [];
  });
  steps["5_workspace"] = uw?.length ? { workspaceId: uw[0].workspace_id } : { error: "no workspace for user" };

  const workspaceId = uw?.[0]?.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, steps }, { status: 200 });
  }

  const account = await prisma.rtAccount.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  steps["6_rt_account"] = account ? { accountId: account.id } : { error: "no rt_account" };

  return NextResponse.json({ ok: !!account, steps }, { status: 200 });
}
