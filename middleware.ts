import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  
  // Redirect bare /launch to /nl/launch (308 permanent redirect for SEO)
  if (pathname === '/launch' || pathname === '/launch/') {
    return NextResponse.redirect(new URL('/nl/launch', request.url), 308);
  }
  
  // Redirect /launch/demo to /nl/launch/demo
  if (pathname === '/launch/demo' || pathname === '/launch/demo/') {
    return NextResponse.redirect(new URL('/nl/launch/demo', request.url), 308);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/launch/:path*']
};