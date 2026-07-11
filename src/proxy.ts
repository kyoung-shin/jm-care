import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

const ADMIN_HOSTNAME = 'jm-care-jm-care.vercel.app';

const PUBLIC_ROUTES = [
  /^\/sign-in(\/.*)?$/,
  /^\/sign-up(\/.*)?$/,
  /^\/pending$/,
  /^\/api\/auth\/(login|signup|logout|check-username)$/,
  /^\/api\/branches$/,
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(r => r.test(pathname));
}

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';

  // Admin domain: rewrite to /admin paths
  if (hostname === ADMIN_HOSTNAME) {
    const pathname = req.nextUrl.pathname;
    if (
      !pathname.startsWith('/admin') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/sign-')
    ) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin' + (pathname === '/' ? '' : pathname);
      return NextResponse.rewrite(url);
    }
  }

  const pathname = req.nextUrl.pathname;
  if (!isPublicRoute(pathname)) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const userId = token ? await verifySessionToken(token) : null;
    if (!userId) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
