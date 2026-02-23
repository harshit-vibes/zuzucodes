import { type NextRequest, NextResponse } from 'next/server';

const NEON_AUTH_COOKIE_PREFIX = '__Secure-neon-auth';

function extractNeonCookies(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter((c) => c.name.startsWith(NEON_AUTH_COOKIE_PREFIX))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

async function fetchSession(cookieHeader: string) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl || !cookieHeader) return { session: null, user: null, setCookieHeader: null };

  try {
    const response = await fetch(`${baseUrl}/get-session`, {
      headers: { Cookie: cookieHeader },
    });
    const setCookieHeader = response.headers.get('set-cookie');
    if (!response.ok) return { session: null, user: null, setCookieHeader };
    const body = await response.json();
    return { session: body.session ?? null, user: body.user ?? null, setCookieHeader };
  } catch {
    return { session: null, user: null, setCookieHeader: null };
  }
}

export default async function middleware(request: NextRequest) {
  const cookieHeader = extractNeonCookies(request);
  const { session, user, setCookieHeader } = await fetchSession(cookieHeader);

  if (!session || !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Forward token-refresh cookies from the auth server onto the browser response
  if (setCookieHeader) {
    response.headers.set('set-cookie', setCookieHeader);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/learn/:path*'],
};
