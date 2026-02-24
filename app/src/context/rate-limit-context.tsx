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

export interface RateLimitState {
  remaining: number | null;
  resetAt: number | null;
  lastSynced: Date | null;
  isSyncing: boolean;
}

interface RateLimitContextValue extends RateLimitState {
  increment: () => void;
  refresh: () => Promise<void>;
}

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

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

  const increment = useCallback(() => {
    const usage = loadUsage();
    usage.count += 1;
    saveUsage(usage);
    setState({
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
      resetAt: getNextMidnightUTC(),
      lastSynced: new Date(),
      isSyncing: false,
    });
  }, []);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    await new Promise(resolve => setTimeout(resolve, 300));
    const usage = loadUsage();
    setState({
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
      resetAt: getNextMidnightUTC(),
      lastSynced: new Date(),
      isSyncing: false,
    });
  }, []);

  return (
    <RateLimitContext.Provider value={{ ...state, increment, refresh }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error('useRateLimit must be used within RateLimitProvider');
  return ctx;
}
