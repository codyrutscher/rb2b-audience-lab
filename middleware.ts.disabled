import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal middleware: pass through only.
 * Auth for /dashboard is enforced in app/dashboard/layout.tsx (client-side redirect)
 * to avoid MIDDLEWARE_INVOCATION_FAILED with @supabase/ssr in Edge.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
