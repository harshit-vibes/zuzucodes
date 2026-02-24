'use client';

import { useRateLimit } from '@/context/rate-limit-context';

function formatTimeUntil(resetAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = resetAt - now;
  if (diff <= 0) return 'soon';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function RateLimitIndicator() {
  const { remaining, resetAt, isSyncing, refresh } = useRateLimit();

  const countColor =
    remaining === null
      ? 'text-muted-foreground/40'
      : remaining <= 5
      ? 'text-red-400'
      : remaining <= 10
      ? 'text-amber-400'
      : 'text-muted-foreground/60';

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-[11px] tabular-nums ${countColor}`}>
        {remaining === null ? '— / 50' : `${remaining} / 50`}
        {resetAt !== null && (
          <span className="text-muted-foreground/40"> · resets in {formatTimeUntil(resetAt)}</span>
        )}
      </span>
      <button
        onClick={refresh}
        disabled={isSyncing}
        title="Sync usage"
        className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors disabled:opacity-30"
      >
        <svg
          className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
