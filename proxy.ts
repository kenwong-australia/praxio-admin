import { NextResponse, type NextRequest } from 'next/server';
import { getAppVariant, isAllowedPathForVariant } from '@/lib/access';

const PUBLIC_PATHS = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon',
  '/opengraph-image',
]);

function isPublicAsset(pathname: string) {
  // Treat any path with a file extension as a static asset (e.g., images under /public)
  if (/\.[^/]+$/.test(pathname)) {
    return true;
  }

  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    PUBLIC_PATHS.has(pathname)
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public assets and API routes
  if (isPublicAsset(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const variant = getAppVariant();

  if (variant === 'user' && !isAllowedPathForVariant(pathname, variant)) {
    // Redirect user-variant traffic away from disallowed routes
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirect', '/praxio');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|opengraph-image|icon|apple-touch-icon|assets/|api).*)'],
};

