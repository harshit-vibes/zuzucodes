import { neonAuthMiddleware } from '@neondatabase/auth/next/server';

export default neonAuthMiddleware({
  loginUrl: '/',
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/learn/:path*',
    '/account/:path*',
  ],
};
