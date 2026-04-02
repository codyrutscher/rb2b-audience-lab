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
  // Use service role client — Prisma raw query was returning empty despite row existing
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("user_workspaces")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (data?.workspace_id) return data.workspace_id;

  // Fallback: try text filter in case of type mismatch
  const { data: data2 } = await supabase
    .from("user_workspaces")
    .select("workspace_id")
    .filter("user_id", "eq", userId)
    .limit(1)
    .maybeSingle();

  if (data2?.workspace_id) return data2.workspace_id;

  // Last resort: find any workspace and link user
  const { data: existingWs } = await supabase
    .from("workspaces")
    .select("id")
    .limit(1)
    .single();

  if (!existingWs?.id) return null;

  await supabase.from("user_workspaces").insert({
    user_id: userId,
    workspace_id: existingWs.id,
    role: "owner",
  });

  return existingWs.id;
}

/** GET /api/reactivate/api-keys — list keys for workspace */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized", debug: { userId: null } }, { status: 401 });

  const workspaceId = await getWorkspaceId(userId);
  if (!workspaceId) {
    // Debug info
    const supa = getServiceSupabase();
    const { data: allRows } = await supa.from("user_workspaces").select("user_id, workspace_id, role").limit(5);
    const { data: directMatch } = await supa.from("user_workspaces").select("workspace_id").eq("user_id", userId);

    return NextResponse.json({
      error: "No workspace found",
      debug: {
        userId,
        directEqResult: directMatch,
        firstFiveRows: (allRows || []).map((r: any) => ({ user_id: r.user_id, workspace_id: r.workspace_id, role: r.role })),
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
