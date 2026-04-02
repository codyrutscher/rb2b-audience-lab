import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/reactivate/db";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieList = cookieHeader
    .split(";")
    .map((c) => {
      const [name, ...v] = c.trim().split("=");
      return { name: name?.trim() ?? "", value: v.join("=").trim() };
    })
    .filter((c) => c.name);

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
  return user?.id ?? null;
}

async function getWorkspaceId(userId: string): Promise<string | null> {
  // Use the same pattern as lib/reactivate/auth.ts — raw query with ::text cast
  const uw = await prisma.$queryRaw<{ workspace_id: string }[]>`
    SELECT workspace_id FROM user_workspaces WHERE user_id::text = ${userId} LIMIT 1
  `.catch(() => []);
  return uw?.[0]?.workspace_id ?? null;
}

/** GET /api/reactivate/api-keys — list keys for workspace */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized", debug: { userId: null } }, { status: 401 });

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) {
    // Debug: try to find what's in user_workspaces for this user
    let debugRows: any[] = [];
    try {
      debugRows = await prisma.$queryRaw<any[]>`
        SELECT user_id, workspace_id, role FROM user_workspaces WHERE user_id::text = ${userId}
      `;
    } catch (e) {}

    // Also try without ::text cast
    let debugRows2: any[] = [];
    try {
      const supa = getServiceSupabase();
      const { data } = await supa.from("user_workspaces").select("*").limit(5);
      debugRows2 = data || [];
    } catch (e) {}

    return NextResponse.json({
      error: "No workspace found",
      debug: {
        userId,
        prismaQueryResult: debugRows,
        firstFiveRows: debugRows2.map(r => ({ user_id: r.user_id, workspace_id: r.workspace_id, role: r.role })),
      }
    }, { status: 404 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, permissions, last_used_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data || [] });
}

/** POST /api/reactivate/api-keys — create a new key */
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { name, permissions } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const fullKey = `al_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyPrefix = fullKey.substring(0, 12);

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("api_keys").insert({
    workspace_id: workspaceId,
    name: name.trim(),
    key_hash: fullKey,
    key_prefix: keyPrefix,
    permissions: permissions || ["read"],
    created_by: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key: fullKey, keyPrefix });
}

/** DELETE /api/reactivate/api-keys?id=xxx — delete a key */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
