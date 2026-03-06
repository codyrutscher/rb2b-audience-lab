/**
 * Resolve Reactivate account_id from Supabase session (cookies).
 * Uses request Cookie header first, then next/headers cookies() so API routes see auth.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "./db";

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

export async function getAccountIdFromRequest(request?: Request): Promise<string | null> {
  let cookieList = parseCookieHeader(request?.headers?.get?.("cookie") ?? null);
  if (cookieList.length === 0) {
    const store = await cookies();
    cookieList = store.getAll();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const uw = await prisma.$queryRaw<{ workspace_id: string }[]>`
    SELECT workspace_id FROM user_workspaces WHERE user_id::text = ${user.id} LIMIT 1
  `.catch(() => []);

  const workspaceId = uw?.[0]?.workspace_id;
  if (!workspaceId) return null;

  let account = await prisma.rtAccount.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (!account) {
    account = await prisma.rtAccount.upsert({
      where: { workspaceId },
      create: { workspaceId },
      update: {},
      select: { id: true },
    });
    const existingWebhook = await prisma.rtWebhook.findFirst({
      where: { accountId: account.id },
    });
    if (!existingWebhook) {
      await prisma.rtWebhook.create({ data: { accountId: account.id } }).catch(() => {});
    }
  }
  return account?.id ?? null;
}
