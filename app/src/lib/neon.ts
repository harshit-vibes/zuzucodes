/**
 * Neon Database Client
 * Used for all data storage (courses, modules, user_progress)
 * Supabase is kept only for authentication
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql: NeonQueryFunction<false, false> = neon(process.env.DATABASE_URL);
