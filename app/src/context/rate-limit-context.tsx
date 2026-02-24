'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const DAILY_LIMIT = 50;
const STORAGE_KEY = 'judge0_usage';

interface StoredUsage {
  date: string; // YYYY-MM-DD UTC
  count: number;
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextMidnightUTC(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function loadUsage(): StoredUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getTodayUTC(), count: 0 };
    const parsed = JSON.parse(raw) as StoredUsage;
    if (parsed.date !== getTodayUTC()) return { date: getTodayUTC(), count: 0 };
    return parsed;
  } catch {
    return { date: getTodayUTC(), count: 0 };
  }
}

function saveUsage(usage: StoredUsage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore storage errors
  }
}

// ─── Actions Context (stable refs — never re-renders consumers) ──────────────

interface RateLimitActions {
  /** Returns false if daily limit already reached (no increment). True if incremented. */
  increment: () => boolean;
  refresh: () => Promise<void>;
}

const RateLimitActionsContext = createContext<RateLimitActions | null>(null);

// ─── State Context (re-renders on every count/sync change) ───────────────────

export interface RateLimitState {
  remaining: number | null;
  resetAt: number | null;
  isSyncing: boolean;
  lastSynced: Date | null;
}

const RateLimitStateContext = createContext<RateLimitState | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RateLimitState>({
    remaining: null,
    resetAt: null,
    lastSynced: null,
    isSyncing: false,
  });

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const usage = loadUsage();
    setState({
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
      resetAt: getNextMidnightUTC(),
      lastSynced: null,
      isSyncing: false,
    });
  }, []);

  const increment = useCallback((): boolean => {
    const usage = loadUsage();
    if (usage.count >= DAILY_LIMIT) return false;
    usage.count += 1;
    saveUsage(usage);
    setState({
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
      resetAt: getNextMidnightUTC(),
      lastSynced: new Date(),
      isSyncing: false,
    });
    return true;
  }, []);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    const usage = loadUsage();
    setState({
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
      resetAt: getNextMidnightUTC(),
      lastSynced: new Date(),
      isSyncing: false,
    });
  }, []);

  return (
    <RateLimitActionsContext.Provider value={{ increment, refresh }}>
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

/** Combined hook — subscribes to state changes. Prefer useRateLimitActions() in hot paths. */
export function useRateLimit() {
  return { ...useRateLimitActions(), ...useRateLimitState() };
}
