# Judge0 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Pyodide (in-browser Python) with Judge0 (cloud execution API) and add a global rate-limit indicator in the dashboard footer.

**Architecture:** Client calls `/api/code/run` → server calls Judge0 with `wait=true` → response headers carry `X-RateLimit-requests-Remaining` + `X-RateLimit-requests-Reset` → returned to client → `RateLimitContext` updated → footer re-renders. Manual refresh hits `/api/code/usage` (Judge0 `config_info`).

**Tech Stack:** Next.js API Routes, Judge0 CE via RapidAPI, React Context, Tailwind CSS

---

## Task 1: Add Judge0 env vars

**Files:**
- Modify: `app/.env.local`

**Step 1: Add variables**

Append to `.env.local`:
```
# Judge0 (RapidAPI)
JUDGE0_API_KEY=5d21df2b76msh99de2b48021b0c5p17d9a9jsn50ff3b06dca6
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

**Step 2: Restart dev server** (pick up new env vars)

---

## Task 2: Create Judge0 API client

**Files:**
- Create: `app/src/lib/judge0.ts`

**Step 1: Create the file with this exact content**

```typescript
const API_KEY = process.env.JUDGE0_API_KEY!;
const API_HOST = process.env.JUDGE0_API_HOST!;
const BASE_URL = `https://${API_HOST}`;

const PYTHON_LANGUAGE_ID = 71;

export interface Judge0Result {
  stdout: string;
  stderr: string;
  statusId: number;
  statusDescription: string;
  remaining: number | null;
  resetAt: number | null; // Unix timestamp (seconds)
}

export interface UsageResult {
  remaining: number | null;
  resetAt: number | null;
}

function parseRateLimitHeaders(headers: Headers): { remaining: number | null; resetAt: number | null } {
  const remaining = headers.get('X-RateLimit-requests-Remaining');
  const reset = headers.get('X-RateLimit-requests-Reset');
  return {
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    resetAt: reset !== null ? parseInt(reset, 10) : null,
  };
}

export async function submitCode(sourceCode: string): Promise<Judge0Result> {
  const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: PYTHON_LANGUAGE_ID,
    }),
  });

  const { remaining, resetAt } = parseRateLimitHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`Judge0 error: ${res.status}`);
  }

  const data = await res.json();

  return {
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? data.compile_output ?? '',
    statusId: data.status?.id ?? 0,
    statusDescription: data.status?.description ?? '',
    remaining,
    resetAt,
  };
}

export async function getUsage(): Promise<UsageResult> {
  const res = await fetch(`${BASE_URL}/config_info`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    },
  });

  const { remaining, resetAt } = parseRateLimitHeaders(res.headers);
  return { remaining, resetAt };
}
```

**Step 2: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```
Expected: no errors

---

## Task 3: Create `/api/code/run` route

**Files:**
- Create: `app/src/app/api/code/run/route.ts`

**Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server';
import { submitCode } from '@/lib/judge0';

export async function POST(req: Request) {
  const { code, testCode } = await req.json();

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const source = testCode ? `${code}\n\n${testCode}` : code;

  try {
    const result = await submitCode(source);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```

---

## Task 4: Create `/api/code/usage` route

**Files:**
- Create: `app/src/app/api/code/usage/route.ts`

**Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server';
import { getUsage } from '@/lib/judge0';

export async function GET() {
  try {
    const usage = await getUsage();
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ remaining: null, resetAt: null }, { status: 502 });
  }
}
```

---

## Task 5: Create RateLimitContext

**Files:**
- Create: `app/src/context/rate-limit-context.tsx`

**Step 1: Create the file**

```typescript
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface RateLimitState {
  remaining: number | null;
  resetAt: number | null; // Unix timestamp (seconds)
  lastSynced: Date | null;
  isSyncing: boolean;
}

interface RateLimitContextValue extends RateLimitState {
  update: (remaining: number | null, resetAt: number | null) => void;
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

  const update = useCallback((remaining: number | null, resetAt: number | null) => {
    setState(prev => ({ ...prev, remaining, resetAt, lastSynced: new Date() }));
  }, []);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch('/api/code/usage');
      if (res.ok) {
        const { remaining, resetAt } = await res.json();
        setState({ remaining, resetAt, lastSynced: new Date(), isSyncing: false });
      } else {
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  return (
    <RateLimitContext.Provider value={{ ...state, update, refresh }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error('useRateLimit must be used within RateLimitProvider');
  return ctx;
}
```

**Step 2: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```

---

## Task 6: Create RateLimitIndicator component

**Files:**
- Create: `app/src/components/rate-limit-indicator.tsx`

**Step 1: Create the file**

```typescript
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
```

---

## Task 7: Update dashboard layout

**Files:**
- Modify: `app/src/app/dashboard/layout.tsx`

**Step 1: Replace the entire file content**

```typescript
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getDashboardStats } from "@/lib/data";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardMain } from "@/components/dashboard-main";
import { RateLimitProvider } from "@/context/rate-limit-context";
import { RateLimitIndicator } from "@/components/rate-limit-indicator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = await auth();

  if (!user) {
    redirect("/");
  }

  const courses = await getCoursesForSidebar();
  const courseIds = courses.map((c) => c.id);
  const allModules = courses.flatMap((c) => c.modules);

  const [courseProgress, contentCompletion, stats] = await Promise.all([
    getSidebarProgress(user.id, courseIds),
    allModules.length > 0
      ? getSectionCompletionStatus(user.id, allModules)
      : Promise.resolve({}),
    getDashboardStats(user.id),
  ]);

  return (
    <RateLimitProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          courses={courses}
          courseProgress={courseProgress}
          contentCompletion={contentCompletion}
          stats={stats}
        />
        <SidebarInset className="overflow-hidden flex flex-col">
          <DashboardHeader />
          <DashboardMain>{children}</DashboardMain>
          <footer className="shrink-0 h-7 flex items-center justify-end px-4 border-t border-border/30 bg-background/50">
            <RateLimitIndicator />
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </RateLimitProvider>
  );
}
```

**Step 2: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```

---

## Task 8: Update OutputPanel — remove `loading-python` phase

**Files:**
- Modify: `app/src/components/output-panel.tsx`

**Step 1: Replace `ExecutionPhase` type**

Find:
```typescript
export type ExecutionPhase = 'idle' | 'loading-python' | 'running' | 'success' | 'error';
```

Replace with:
```typescript
export type ExecutionPhase = 'idle' | 'running' | 'success' | 'error';
```

**Step 2: Update `HeaderLabel`** — remove the `loading-python` case entirely

Find and remove this block:
```typescript
  if (phase === 'loading-python') {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">Loading Python…</span>
    );
  }
```

**Step 3: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```

---

## Task 9: Rewrite CodeLessonLayout — remove Pyodide, wire Judge0

**Files:**
- Modify: `app/src/components/code-lesson-layout.tsx`

**Step 1: Remove Pyodide singleton and imports**

Remove these lines entirely (lines 13–37):
```typescript
// Pyodide singleton — persists across lesson navigations
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(script);
      });
    }
    pyodideInstance = await (window as any).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
    });
    return pyodideInstance;
  })();

  return pyodideLoading;
}
```

**Step 2: Add `useRateLimit` import** at top of file (after existing imports):
```typescript
import { useRateLimit } from '@/context/rate-limit-context';
```

**Step 3: Add `useRateLimit` call** inside the component body (after `const router = useRouter();`):
```typescript
const { update: updateRateLimit } = useRateLimit();
```

**Step 4: Replace `handleRun`** entirely with:

```typescript
const handleRun = async () => {
  setExecutionPhase('running');
  setOutput('');
  setParsedError(null);
  setTestPassed(false);

  try {
    const res = await fetch('/api/code/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, testCode }),
    });

    if (res.status === 429) {
      const { resetAt } = await res.json().catch(() => ({}));
      const msg = resetAt
        ? `Daily limit reached · resets in ${formatTimeUntil(resetAt)}`
        : 'Daily limit reached · resets tomorrow';
      setParsedError({ errorType: 'LimitError', message: msg, line: null, raw: msg });
      setExecutionPhase('error');
      return;
    }

    if (!res.ok) {
      const msg = 'Execution service unavailable';
      setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
      setExecutionPhase('error');
      return;
    }

    const result = await res.json();

    // Update global rate limit display
    if (result.remaining !== null || result.resetAt !== null) {
      updateRateLimit(result.remaining, result.resetAt);
    }

    const { stdout, stderr, statusId } = result;

    // statusId 3 = Accepted, anything else with stderr = error
    if (stderr || (statusId !== 3 && statusId !== 0)) {
      const errorText = stderr || `Runtime error (status ${statusId})`;
      setParsedError(parsePythonError(errorText.trim()));
      setExecutionPhase('error');
    } else if (testCode) {
      setTestPassed(true);
      setExecutionPhase('success');

      if (isAuthenticated && !isCompleted) {
        fetch('/api/progress/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, courseId }),
        }).catch(() => {});
      }

      await new Promise(resolve => setTimeout(resolve, 700));
      router.push(nextHref);
    } else {
      setOutput(stdout.trim());
      setExecutionPhase('success');
    }
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Network error';
    setParsedError({ errorType: 'Error', message, line: null, raw: message });
    setExecutionPhase('error');
  }
};
```

**Step 5: Add `formatTimeUntil` helper** above the component (after imports):

```typescript
function formatTimeUntil(resetAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = resetAt - now;
  if (diff <= 0) return 'soon';
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
```

**Step 6: Update run button label** — remove `loading-python` check:

Find:
```typescript
{executionPhase === 'loading-python' || executionPhase === 'running' ? 'running···' : 'run'}
```
Replace with:
```typescript
{executionPhase === 'running' ? 'running···' : 'run'}
```

Find:
```typescript
disabled={executionPhase === 'loading-python' || executionPhase === 'running'}
```
Replace with:
```typescript
disabled={executionPhase === 'running'}
```

**Step 7: Verify TypeScript**
```bash
npx --prefix app tsc --noEmit
```
Expected: no errors

---

## Verification Checklist

1. **Cold run** — click run on a lesson with code → `"running···"` shows immediately (no "Loading Python" delay), result appears
2. **NameError** → clean `"NameError  line N / name 'x' is not defined"` in OutputPanel
3. **Test pass** → `"All tests passed!"` + green check, navigates to next lesson
4. **Test fail** → `"Test failed / Expected 10, got 5"` in OutputPanel
5. **Rate limit footer** — visible bottom-right on all dashboard pages
6. **Manual refresh** — clicking ↺ updates the count
7. **No Pyodide in network tab** — confirm `pyodide.js` is never loaded
