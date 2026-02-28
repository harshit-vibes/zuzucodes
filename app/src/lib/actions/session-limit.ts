'use server';

import { authServer } from '@/lib/auth/server';

const MAX_SESSIONS = 2;

/**
 * Revokes oldest sessions if the current user has more than MAX_SESSIONS active.
 * Non-blocking — call with `void enforceSessionLimit()` in layout.
 */
export async function enforceSessionLimit() {
  try {
    const result = await authServer.listSessions();
    // better-auth vanilla client returns { data, error }
    const sessions = (result as unknown as { data?: { token: string; createdAt: Date | string }[] | null; error?: unknown }).data;
    if (!sessions || sessions.length <= MAX_SESSIONS) return;

    // Sort ascending by createdAt — oldest first
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Revoke all beyond the MAX_SESSIONS most recent
    const toRevoke = sorted.slice(0, sorted.length - MAX_SESSIONS);
    await Promise.all(
      toRevoke.map((s) =>
        authServer.revokeSession({ token: s.token } as Parameters<typeof authServer.revokeSession>[0])
      )
    );
  } catch {
    // Never break dashboard load
  }
}
