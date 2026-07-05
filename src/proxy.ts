import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const ADMIN_HOSTNAME = 'jm-care-jm-care.vercel.app';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pending',
  '/onboarding',
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
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

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
