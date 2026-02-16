import { createAuthServer, neonAuth } from '@neondatabase/auth/next/server';

// Server auth API client for server actions
export const authServer = createAuthServer();

// Session getter for server components (returns { session, user })
export const auth = neonAuth;
