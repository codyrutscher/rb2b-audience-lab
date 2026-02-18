import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple logging
  console.log('Request:', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
