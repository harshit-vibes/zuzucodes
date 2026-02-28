import { sql } from '@/lib/neon';

// ─── Limits ──────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  perMin: 10,
  per3hr: 100,
  perDay: 300,
} as const;

// ─── Error ───────────────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(
    public readonly window: 'perMin' | 'per3hr' | 'perDay',
    public readonly resetAt: Date,
  ) {
    super(`Rate limit exceeded: ${window}`);
    this.name = 'RateLimitError';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserUsage {
  perMin: number;
  per3hr: number;
  perDay: number;
  limits: typeof RATE_LIMITS;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function queryCounts(userId: string): Promise<{ perMin: number; per3hr: number; perDay: number }> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '1 minute')  AS per_min,
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '3 hours')   AS per_3hr,
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '24 hours')  AS per_day
    FROM code_runs
    WHERE user_id = ${userId}
      AND executed_at > NOW() - INTERVAL '24 hours'
  `;
  const row = rows[0] as Record<string, string>;
  return {
    perMin: parseInt(row.per_min, 10),
    per3hr: parseInt(row.per_3hr, 10),
    perDay: parseInt(row.per_day, 10),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Throws RateLimitError if any window is exceeded.
 * Call this BEFORE forwarding to Judge0.
 */
export async function checkRateLimit(userId: string): Promise<void> {
  const { perMin, per3hr, perDay } = await queryCounts(userId);

  if (perMin >= RATE_LIMITS.perMin) {
    throw new RateLimitError('perMin', new Date(Date.now() + 60_000));
  }
  if (per3hr >= RATE_LIMITS.per3hr) {
    throw new RateLimitError('per3hr', new Date(Date.now() + 3 * 60 * 60 * 1000));
  }
  if (perDay >= RATE_LIMITS.perDay) {
    const resetAt = new Date();
    resetAt.setUTCHours(24, 0, 0, 0);
    throw new RateLimitError('perDay', resetAt);
  }
}

/**
 * Insert a run record. Call this AFTER a successful Judge0 response.
 */
export async function recordRun(userId: string): Promise<void> {
  await sql`INSERT INTO code_runs (user_id) VALUES (${userId})`;
}

/**
 * Return current usage counts + limits for the usage API.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const counts = await queryCounts(userId);
  return { ...counts, limits: RATE_LIMITS };
}
