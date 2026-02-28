import { NextRequest, NextResponse } from 'next/server';

const VERIFIER_PARAM = 'neon_auth_session_verifier';

/**
 * Exchanges the Neon Auth session verifier on /auth/callback server-side.
 *
 * neonAuthMiddleware intentionally skips /auth/callback, leaving the verifier
 * exchange to the client. But because the server component's auth() check runs
 * before the client, the session cookie is never set in time for the redirect to
 * /dashboard. This middleware fills that gap: exchange the verifier → set cookie →
 * redirect to the clean callback URL → server component now sees the session.
 */
export async function middleware(request: NextRequest) {
  const verifier = request.nextUrl.searchParams.get(VERIFIER_PARAM);
  if (!verifier) return NextResponse.next();

  const baseURL = process.env.NEON_AUTH_BASE_URL;
  if (!baseURL) return NextResponse.next();

  try {
    const upstreamUrl = `${baseURL}/get-session?${VERIFIER_PARAM}=${encodeURIComponent(verifier)}`;

    const response = await fetch(upstreamUrl, {
      headers: {
        Cookie: request.headers.get('cookie') ?? '',
        Origin: request.nextUrl.origin,
        'x-neon-auth-proxy': 'nextjs',
      },
    });

    if (response.ok) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete(VERIFIER_PARAM);

      const redirect = NextResponse.redirect(cleanUrl);

      const setCookie = response.headers.get('set-cookie');
      if (setCookie) redirect.headers.set('set-cookie', setCookie);

      return redirect;
    }
  } catch {
    // Fall through — client-side AuthCallback will handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/callback'],
};
