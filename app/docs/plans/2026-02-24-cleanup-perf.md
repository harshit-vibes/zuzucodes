# Cleanup & Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete dead files, drop an unused schema column, optimize a DB function with correlated subqueries, and split RateLimitContext to prevent CodeLessonLayout re-rendering on every code run.

**Architecture:** Three independent tasks — file deletion, schema migration, React context split. No task depends on another; they can be executed sequentially without risk of conflict.

**Tech Stack:** Next.js 16 App Router, TypeScript, Neon Postgres (raw SQL), React Context API.

---

## Task 1: Delete Dead Files

**Files:**
- Delete: `src/lib/db.ts`
- Delete: `src/lib/validation.ts`

**Context:** Both files have zero imports across the entire codebase. `db.ts` is an exact duplicate of `neon.ts`. `validation.ts` is ~700 lines validating schema fields that no longer exist.

---

**Step 1: Confirm zero imports before deleting**

Run from `app/` directory:
```bash
grep -r "from.*lib/db" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*lib/validation" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output for both.

**Step 2: Delete both files**

```bash
rm src/lib/db.ts src/lib/validation.ts
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If any import errors surface, update those imports to use `@/lib/neon` instead.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete dead files db.ts and validation.ts"
```

---

## Task 2: SQL Migration — Schema Cleanup + DB Function Optimization

**Files:**
- Create: `migrations/20260224-cleanup-perf.sql`

**Context:**

`user_quiz_attempts.answers` (JSONB) was defined in `20260223-lessons-code-execution.sql` but is never read or written by any TypeScript code. It's dead weight on every quiz insert.

`get_batch_module_completion_status` (called from `data.ts:762`) has two correlated subqueries per row — one COUNT and one EXISTS — both scanning `user_lesson_progress` and `user_quiz_attempts` per module. Rewrite using CTEs so each table is scanned once.

`get_section_completion_status` has zero TypeScript callers (confirmed with grep). Drop it.

---

**Step 1: Create the migration file**

Create `app/migrations/20260224-cleanup-perf.sql` with this exact content:

```sql
BEGIN;

-- =====================================================
-- 1. Drop unused column: user_quiz_attempts.answers
-- =====================================================
ALTER TABLE user_quiz_attempts DROP COLUMN IF EXISTS answers;


-- =====================================================
-- 2. Drop unused DB function: get_section_completion_status
--    Zero TypeScript callers confirmed.
-- =====================================================
DROP FUNCTION IF EXISTS get_section_completion_status(text, jsonb);


-- =====================================================
-- 3. Rewrite get_batch_module_completion_status
--    Current: two correlated subqueries per module row (O(N) scans)
--    Fix: three CTEs with aggregate JOINs (single scan per table)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_batch_module_completion_status(
  p_user_id    text,
  p_module_ids text[]
)
RETURNS TABLE(module_id text, all_lessons_completed boolean, quiz_completed boolean)
LANGUAGE sql AS $$
  WITH lesson_totals AS (
    -- Count lessons per module (single scan of lessons table)
    SELECT l.module_id, COUNT(*) AS total
    FROM lessons l
    WHERE l.module_id = ANY(p_module_ids)
    GROUP BY l.module_id
  ),
  lesson_completions AS (
    -- Count completed lessons per module (single scan of user_lesson_progress + lessons)
    SELECT l.module_id, COUNT(*) AS completed
    FROM user_lesson_progress ulp
    JOIN lessons l ON l.id = ulp.lesson_id
    WHERE ulp.user_id = p_user_id
      AND l.module_id = ANY(p_module_ids)
    GROUP BY l.module_id
  ),
  quiz_completions AS (
    -- Check passed quiz per module (single scan of user_quiz_attempts)
    SELECT uqa.module_id, bool_or(uqa.passed) AS quiz_passed
    FROM user_quiz_attempts uqa
    WHERE uqa.user_id = p_user_id
      AND uqa.module_id = ANY(p_module_ids)
    GROUP BY uqa.module_id
  )
  SELECT
    m.id AS module_id,
    COALESCE(lc.completed, 0) >= COALESCE(lt.total, 0) AS all_lessons_completed,
    COALESCE(qc.quiz_passed, false)                     AS quiz_completed
  FROM modules m
  LEFT JOIN lesson_totals     lt ON lt.module_id = m.id
  LEFT JOIN lesson_completions lc ON lc.module_id = m.id
  LEFT JOIN quiz_completions   qc ON qc.module_id = m.id
  WHERE m.id = ANY(p_module_ids)
$$;

COMMIT;
```

**Step 2: Apply the migration**

Connect to your Neon Postgres and run the migration. Via psql:
```bash
psql "$DATABASE_URL" -f migrations/20260224-cleanup-perf.sql
```

Expected: `ALTER TABLE`, `DROP FUNCTION`, `CREATE FUNCTION`, `COMMIT` — no errors.

**Step 3: Verify the function works**

Run a quick sanity query in psql (substitute a real user_id and module_id from your DB):
```sql
SELECT * FROM get_batch_module_completion_status('some-user-id', ARRAY['some-module-id']);
```

Expected: one row with `module_id`, `all_lessons_completed` (bool), `quiz_completed` (bool).

**Step 4: Commit**

```bash
git add migrations/20260224-cleanup-perf.sql
git commit -m "feat: drop user_quiz_attempts.answers, optimize get_batch_module_completion_status"
```

---

## Task 3: React Context Split — RateLimitContext

**Files:**
- Modify: `src/context/rate-limit-context.tsx`
- Modify: `src/components/code-lesson-layout.tsx`
- Modify: `src/components/rate-limit-indicator.tsx`

**Context:**

`CodeLessonLayout` currently calls `useRateLimit()` which subscribes to `remaining` + `resetAt`. Every call to `increment()` updates those values, causing the entire lesson layout (editor + prose pane) to re-render. The fix: split into two contexts.

- `RateLimitActionsContext` — holds `increment` + `refresh`. Stable references, never re-renders consumers.
- `RateLimitStateContext` — holds `remaining`, `resetAt`, `isSyncing`, `lastSynced`. Re-renders on every state change.

`CodeLessonLayout` subscribes only to actions → zero re-renders from count updates.
`RateLimitIndicator` subscribes to both state + actions (it needs `refresh`).

The `increment()` function changes signature: returns `boolean`. Returns `false` if daily limit already reached (no increment). Returns `true` if incremented successfully. This moves the limit guard into the action itself — `CodeLessonLayout` no longer needs to read `remaining`.

---

**Step 1: Rewrite `src/context/rate-limit-context.tsx`**

Replace the entire file with:

```typescript
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
```

**Step 2: Update `src/components/code-lesson-layout.tsx`**

Two changes:

1. Replace the import line:
```typescript
// Before:
import { useRateLimit } from '@/context/rate-limit-context';

// After:
import { useRateLimitActions } from '@/context/rate-limit-context';
```

2. Replace the destructuring inside `CodeLessonLayout`:
```typescript
// Before:
const { increment: incrementRateLimit, remaining, resetAt } = useRateLimit();

// After:
const { increment: incrementRateLimit } = useRateLimitActions();
```

3. Replace the `handleRun` function (lines 106–170 in current file). The key changes:
   - Remove the `remaining`/`resetAt` guard block
   - Call `incrementRateLimit()` at the top before the API call (returns false if at limit)
   - Remove the `incrementRateLimit()` call that was after the successful `res.ok` check

New `handleRun`:
```typescript
const handleRun = async () => {
  // Limit guard + optimistic increment (reads localStorage directly — always accurate)
  if (!incrementRateLimit()) {
    setParsedError({
      errorType: 'LimitError',
      message: 'Daily limit reached · see footer for reset time',
      line: null,
      raw: '',
    });
    setExecutionPhase('error');
    return;
  }

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

    if (!res.ok) {
      const msg = 'Execution service unavailable';
      setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
      setExecutionPhase('error');
      return;
    }

    const result = await res.json();
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

4. Delete the `formatTimeUntil` helper function (lines 31–39 in current file) — it was only used by the removed limit guard.

**Step 3: Update `src/components/rate-limit-indicator.tsx`**

Replace the import and hook call:

```typescript
// Before:
import { useRateLimit } from '@/context/rate-limit-context';
// ...
const { remaining, resetAt, isSyncing, refresh } = useRateLimit();

// After:
import { useRateLimitActions, useRateLimitState } from '@/context/rate-limit-context';
// ...
const { remaining, resetAt, isSyncing } = useRateLimitState();
const { refresh } = useRateLimitActions();
```

Everything else in the component stays identical.

**Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `formatTimeUntil` still has a reference somewhere, remove it.

**Step 5: Smoke test**

Start the dev server and open a lesson page. Run code multiple times. Verify:
- The prose pane and header do NOT flicker/re-render visibly on each run
- The footer rate limit counter updates after each run
- Running code when at 50/50 shows "Daily limit reached · see footer for reset time" in the output panel
- The ↺ refresh button in the footer still works

**Step 6: Commit**

```bash
git add src/context/rate-limit-context.tsx src/components/code-lesson-layout.tsx src/components/rate-limit-indicator.tsx
git commit -m "perf: split RateLimitContext to prevent CodeLessonLayout re-renders"
```
