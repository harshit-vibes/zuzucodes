'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { RATE_LIMITS } from '@/lib/rate-limit';

// ─── State ───────────────────────────────────────────────────────────────────

export interface RateLimitState {
  // "remaining" reflects the most constrained window (min of all three)
  remaining: number | null;
  resetAt: number | null;
  isSyncing: boolean;
  lastSynced: Date | null;
}

const RateLimitStateContext = createContext<RateLimitState | null>(null);

// ─── Actions ─────────────────────────────────────────────────────────────────

interface RateLimitActions {
  refresh: () => Promise<void>;
}

const RateLimitActionsContext = createContext<RateLimitActions | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RateLimitState>({
    remaining: null,
    resetAt: null,
    lastSynced: null,
    isSyncing: false,
  });

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch('/api/code/usage');
      if (!res.ok) throw new Error('Usage fetch failed');

      const data = await res.json() as {
        perMin: number;
        per3hr: number;
        perDay: number;
        limits: typeof RATE_LIMITS;
      };

      // Most constrained window determines "remaining"
      const remainingMin = data.limits.perMin - data.perMin;
      const remaining3hr = data.limits.per3hr - data.per3hr;
      const remainingDay = data.limits.perDay - data.perDay;
      const remaining = Math.max(0, Math.min(remainingMin, remaining3hr, remainingDay));

      // resetAt: next midnight UTC (day window)
      const resetAt = new Date();
      resetAt.setUTCHours(24, 0, 0, 0);

      setState({
        remaining,
        resetAt: Math.floor(resetAt.getTime() / 1000),
        lastSynced: new Date(),
        isSyncing: false,
      });
    } catch {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RateLimitActionsContext.Provider value={{ refresh }}>
      <RateLimitStateContext.Provider value={state}>
        {children}
      </RateLimitStateContext.Provider>
    </RateLimitActionsContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useRateLimitActions(): RateLimitActions {
  const ctx = useContext(RateLimitActionsContext);
  if (!ctx) throw new Error('useRateLimitActions must be used within RateLimitProvider');
  return ctx;
}

export function useRateLimitState(): RateLimitState {
  const ctx = useContext(RateLimitStateContext);
  if (!ctx) throw new Error('useRateLimitState must be used within RateLimitProvider');
  return ctx;
}

export function useRateLimit() {
  return { ...useRateLimitActions(), ...useRateLimitState() };
}
