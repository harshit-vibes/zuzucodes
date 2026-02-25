# Lesson Player UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the lesson player with confetti-on-pass (no auto-nav), test result persistence across sessions, and a structured problem statement panel above the code editor.

**Architecture:** DB gets two new columns (`lessons.problem JSONB`, `user_code.last_test_results JSONB`). The data layer, save API, and server page prop chain are updated. Three client-side component changes: new `ProblemPanel`, updated `CodeLessonLayout` (hydration + confetti + prominent next), and no changes to `OutputPanel`.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (raw SQL), TypeScript, Tailwind CSS v4, `canvas-confetti` (new dep)

**Design doc:** `docs/plans/2026-02-25-lesson-player-ux-design.md`

---

### Task 1: Install canvas-confetti

**Files:**
- Modify: `app/package.json` (via npm)

**Step 1: Install the package**

```bash
cd app && npm install canvas-confetti && npm install --save-dev @types/canvas-confetti
```

**Step 2: Verify types resolve**

```bash
cd app && npx tsc --noEmit
```
Expected: no new errors (canvas-confetti types are straightforward).

**Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: add canvas-confetti dependency"
```

---

### Task 2: DB Migration — add problem + last_test_results columns

**Files:**
- Create: `app/migrations/2026-02-25-lesson-player-ux.sql`

**Step 1: Write the migration file**

```sql
-- Migration: Lesson player UX improvements
-- Date: 2026-02-25
--
-- lessons.problem: JSONB for structured problem statement { summary, constraints[], hints[] }
-- user_code.last_test_results: JSONB array of TestCaseResult for result persistence

BEGIN;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS problem JSONB DEFAULT NULL;

ALTER TABLE user_code
  ADD COLUMN IF NOT EXISTS last_test_results JSONB DEFAULT NULL;

COMMIT;
```

**Step 2: Run the migration against your Neon DB**

```bash
# From project root — use your preferred Neon connection method
# e.g. via psql or the Neon console SQL editor
psql $DATABASE_URL -f app/migrations/2026-02-25-lesson-player-ux.sql
```
Expected: `ALTER TABLE` twice, no errors.

**Step 3: Verify columns exist**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('lessons', 'user_code')
  AND column_name IN ('problem', 'last_test_results');
```
Expected: 2 rows returned.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-25-lesson-player-ux.sql
git commit -m "feat: add problem + last_test_results columns (migration)"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `app/src/lib/judge0.ts` — add `visible` to `TestCase`
- Modify: `app/src/lib/data.ts` — add `LessonProblem`, `UserCode` interfaces; update `LessonData`

**Step 1: Add `visible` to `TestCase` in `judge0.ts`**

In `app/src/lib/judge0.ts`, find:
```ts
export interface TestCase {
  description: string;
  args: unknown[];
  expected: unknown;
}
```
Replace with:
```ts
export interface TestCase {
  description: string;
  args: unknown[];
  expected: unknown;
  visible?: boolean; // if true, shown as example in ProblemPanel
}
```

**Step 2: Add `LessonProblem` and `UserCode` interfaces to `data.ts`**

In `app/src/lib/data.ts`, after the existing imports at the top, add after the `ContentItem` type:

```ts
export interface LessonProblem {
  summary: string;
  constraints?: string[];
  hints?: string[];
}

export interface UserCode {
  code: string;
  lastTestResults: import('@/lib/judge0').TestCaseResult[] | null;
}
```

**Step 3: Update `LessonData` interface in `data.ts`**

Find:
```ts
export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;
  title: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
}
```
Replace with:
```ts
export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;
  title: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
  problem: LessonProblem | null;
}
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: errors on `getLesson` and `getUserCode` — they don't return the new fields yet. That's expected; fix in next tasks.

**Step 5: Commit**

```bash
git add app/src/lib/judge0.ts app/src/lib/data.ts
git commit -m "feat: add LessonProblem, UserCode types and visible flag on TestCase"
```

---

### Task 4: Update data layer — getLesson and getUserCode

**Files:**
- Modify: `app/src/lib/data.ts`

**Step 1: Update `getLesson` SQL query to include `problem`**

In `app/src/lib/data.ts`, find the SQL inside `getLesson`:
```ts
const result = await sql`
  SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
         l.test_cases, l.entry_point, l.solution_code,
         m.id AS module_id, m.title AS module_title
```
Replace with:
```ts
const result = await sql`
  SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
         l.test_cases, l.entry_point, l.solution_code, l.problem,
         m.id AS module_id, m.title AS module_title
```

**Step 2: Update the return object in `getLesson`**

Find:
```ts
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      testCases: (row.test_cases as TestCase[] | null) ?? null,
      entryPoint: row.entry_point ?? null,
      solutionCode: row.solution_code ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
    };
```
Replace with:
```ts
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      testCases: (row.test_cases as TestCase[] | null) ?? null,
      entryPoint: row.entry_point ?? null,
      solutionCode: row.solution_code ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
      problem: (row.problem as LessonProblem | null) ?? null,
    };
```

**Step 3: Update `getUserCode` to return `UserCode | null`**

Find the entire `getUserCode` function:
```ts
export async function getUserCode(userId: string, lessonId: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT code FROM user_code WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    return result.length > 0 ? (result[0] as any).code : null;
  } catch (error) {
    console.error('getUserCode error:', error);
    return null;
  }
}
```
Replace with:
```ts
export async function getUserCode(userId: string, lessonId: string): Promise<UserCode | null> {
  try {
    const result = await sql`
      SELECT code, last_test_results FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    if (result.length === 0) return null;
    const row = result[0] as any;
    return {
      code: row.code,
      lastTestResults: (row.last_test_results as import('@/lib/judge0').TestCaseResult[] | null) ?? null,
    };
  } catch (error) {
    console.error('getUserCode error:', error);
    return null;
  }
}
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: errors move to `LessonPage` (uses old `getUserCode` return shape) — fix in Task 6.

**Step 5: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: update getLesson and getUserCode to return problem and lastTestResults"
```

---

### Task 5: Update /api/code/save to persist testResults

**Files:**
- Modify: `app/src/app/api/code/save/route.ts`

**Step 1: Update the route to accept and write `testResults`**

Replace the entire file content:
```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return new NextResponse(null, { status: 204 });
  }

  const { lessonId, code, testResults } = await req.json();

  if (!lessonId || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing lessonId or code' }, { status: 400 });
  }

  const resultsJson = testResults !== undefined ? testResults : null;

  if (resultsJson !== null) {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, last_test_results, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, ${JSON.stringify(resultsJson)}, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET code = EXCLUDED.code,
                    last_test_results = EXCLUDED.last_test_results,
                    updated_at = NOW()
    `;
  } else {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
    `;
  }

  return new NextResponse(null, { status: 204 });
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: no new errors from this file.

**Step 3: Commit**

```bash
git add app/src/app/api/code/save/route.ts
git commit -m "feat: persist testResults in /api/code/save"
```

---

### Task 6: Update LessonPage server component

**Files:**
- Modify: `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx`

**Step 1: Update page.tsx to thread new props**

Replace the entire file content:
```tsx
import { getLesson, getModule, getLessonCount, isLessonCompleted, getUserCode } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { CodeLessonLayout } from '@/components/lesson/code-lesson-layout';

interface LessonPageProps {
  params: Promise<{ courseId: string; moduleId: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, moduleId, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [lessonData, module, lessonCount] = await Promise.all([
    getLesson(moduleId, position),
    getModule(moduleId),
    getLessonCount(moduleId),
  ]);

  if (!lessonData || !module) {
    notFound();
  }

  const [isCompleted, userCode] = await Promise.all([
    user ? isLessonCompleted(user.id, lessonData.id) : Promise.resolve(false),
    user ? getUserCode(user.id, lessonData.id) : Promise.resolve(null),
  ]);

  return (
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      testCases={lessonData.testCases}
      entryPoint={lessonData.entryPoint}
      solutionCode={lessonData.solutionCode}
      savedCode={userCode?.code ?? null}
      lastTestResults={userCode?.lastTestResults ?? null}
      problem={lessonData.problem}
      lessonId={lessonData.id}
      courseId={courseId}
      moduleId={moduleId}
      moduleTitle={module.title}
      position={position}
      lessonCount={lessonCount}
      isAuthenticated={!!user}
      isCompleted={isCompleted}
    />
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: errors on `CodeLessonLayout` — it doesn't accept `lastTestResults` or `problem` yet. Fix in Tasks 7–8.

**Step 3: Commit**

```bash
git add app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx
git commit -m "feat: pass lastTestResults and problem from LessonPage to CodeLessonLayout"
```

---

### Task 7: Build ProblemPanel component

**Files:**
- Create: `app/src/components/lesson/problem-panel.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import type { LessonProblem } from '@/lib/data';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problem: LessonProblem;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  lessonId: string;
}

export function ProblemPanel({ problem, testCases, entryPoint, lessonId }: ProblemPanelProps) {
  const storageKey = `problem-panel-collapsed:${lessonId}`;
  const [collapsed, setCollapsed] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  // Restore collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'true') setCollapsed(true);
  }, [storageKey]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);
  const hints = problem.hints ?? [];
  const constraints = problem.constraints ?? [];

  return (
    <div className="shrink-0 border-b border-border dark:border-zinc-700">
      {/* Toolbar */}
      <button
        onClick={toggleCollapsed}
        className="w-full h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 hover:bg-muted dark:hover:bg-zinc-700 transition-colors"
      >
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">problem</span>
        <svg
          className={`w-3 h-3 text-muted-foreground/50 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 py-3 space-y-3 bg-background dark:bg-zinc-950 max-h-56 overflow-y-auto">

          {/* Summary */}
          <p className="text-sm text-foreground/80 leading-relaxed">
            {problem.summary}
          </p>

          {/* Examples */}
          {visibleExamples.length > 0 && entryPoint && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">examples</span>
              <div className="space-y-1">
                {visibleExamples.map((tc, i) => (
                  <div key={i} className="font-mono text-xs bg-muted/40 dark:bg-zinc-800/60 rounded px-2.5 py-1.5 flex items-center gap-2">
                    <span className="text-foreground/70">
                      {entryPoint}({(tc.args as unknown[]).map(a => JSON.stringify(a)).join(', ')})
                    </span>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="text-emerald-400/90">{JSON.stringify(tc.expected)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {constraints.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">constraints</span>
              <div className="flex flex-wrap gap-1.5">
                {constraints.map((c, i) => (
                  <span key={i} className="font-mono text-[11px] text-muted-foreground/70 bg-muted/40 dark:bg-zinc-800/60 rounded px-2 py-0.5">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">hints</span>
              {hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="text-xs text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-2.5 py-1.5 border border-border/30">
                  {hint}
                </div>
              ))}
              {hintsRevealed < hints.length && (
                <button
                  onClick={() => setHintsRevealed(h => h + 1)}
                  className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  show hint {hintsRevealed + 1}/{hints.length} →
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors from this file.

**Step 3: Commit**

```bash
git add app/src/components/lesson/problem-panel.tsx
git commit -m "feat: add ProblemPanel component with summary, examples, constraints, hints"
```

---

### Task 8: Update CodeLessonLayout — new props, hydration, confetti, prominent next

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Step 1: Add new imports at the top**

After the existing imports, add:
```ts
import confetti from 'canvas-confetti';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import type { LessonProblem } from '@/lib/data';
import type { TestCaseResult } from '@/lib/judge0';
```

**Step 2: Add new props to the interface**

In `CodeLessonLayoutProps`, add:
```ts
  lastTestResults: TestCaseResult[] | null;
  problem: LessonProblem | null;
```

**Step 3: Destructure new props in the function signature**

Add `lastTestResults` and `problem` to the destructured params:
```ts
export function CodeLessonLayout({
  // ...existing props
  lastTestResults,
  problem,
}: CodeLessonLayoutProps) {
```

**Step 4: Add showCelebration state and hydration effect**

After the existing `useState` declarations (after `const [metrics, setMetrics] = useState...`), add:
```ts
  const [showCelebration, setShowCelebration] = useState(false);

  // Hydrate output panel with persisted test results on mount
  useEffect(() => {
    if (lastTestResults && lastTestResults.length > 0) {
      const allPassed = lastTestResults.every(r => r.pass);
      setTestResults(lastTestResults);
      setExecutionPhase(allPassed ? 'run-pass' : 'run-fail');
      setHasRun(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 5: Replace the auto-navigation block in handleRun with confetti + save**

Find this block inside `handleRun` (around line 177):
```ts
          if (testResult.allPassed) {
            if (isAuthenticated && !isCompleted) {
              fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, courseId }),
              }).catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 700));
            router.push(nextHref);
          }
```
Replace with:
```ts
          // Save test results immediately (not debounced — deliberate run action)
          if (isAuthenticated) {
            fetch('/api/code/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lessonId, code, testResults: testResult.tests }),
            }).catch(() => {});
          }

          if (testResult.allPassed) {
            if (isAuthenticated && !isCompleted) {
              fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, courseId }),
              }).catch(() => {});
            }
            setShowCelebration(true);
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { x: 0.5, y: 1 },
              colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
              disableForReducedMotion: true,
            });
          }
```

**Step 6: Update the footer next button to be prominent on celebration/completion**

In the Footer JSX, find the `{/* Right: actions */}` section. Replace the two existing "continue" Link blocks (for `!hasCode` and `hasCode && !testCases`) AND add a new prominent button for test-case lessons:

```tsx
        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Theory lesson — no code */}
          {!hasCode && (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 px-3 h-7 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-mono transition-colors"
            >
              {hasNext ? 'continue' : 'take quiz'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Code lesson — no test cases */}
          {hasCode && !testCases && (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 px-3 h-7 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-mono transition-colors"
            >
              {hasNext ? 'continue' : 'take quiz'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Code lesson with test cases — only shown when passed */}
          {hasCode && testCases && (showCelebration || isCompleted) && (
            <Link
              href={nextHref}
              className={`flex items-center gap-1.5 px-3 h-7 rounded text-xs font-mono transition-all bg-primary text-primary-foreground hover:bg-primary/90 ${
                showCelebration ? 'animate-bounce' : ''
              }`}
            >
              {hasNext ? 'next →' : 'take quiz →'}
            </Link>
          )}

        </div>
```

**Step 7: Add ProblemPanel to the CodePane JSX**

In the `CodePane` constant, find:
```tsx
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <CodeEditor value={code} onChange={handleCodeChange} />
```
Replace with:
```tsx
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {problem && (
        <ProblemPanel
          problem={problem}
          testCases={testCases}
          entryPoint={entryPoint}
          lessonId={lessonId}
        />
      )}
      <CodeEditor value={code} onChange={handleCodeChange} />
```

**Step 8: Remove the unused router import if router is no longer used**

Check if `router` is still used anywhere in the file. Since `router.push` was removed, find and remove:
```ts
import { useRouter } from 'next/navigation';
```
and
```ts
  const router = useRouter();
```

**Step 9: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: 0 errors.

**Step 10: Lint**

```bash
cd app && npm run lint
```
Expected: 0 errors.

**Step 11: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: add confetti on pass, persistent result hydration, ProblemPanel wiring"
```

---

### Task 9: Smoke test in dev

**Step 1: Start dev server**

```bash
cd app && npm run dev
```

**Step 2: Manual checklist**

- [ ] Navigate to a code lesson with test cases
- [ ] Problem panel renders above editor with summary/examples/constraints
- [ ] Collapse panel, reload — stays collapsed
- [ ] Run code with failing tests — output shows, next button stays muted
- [ ] Run code with passing solution — confetti fires, next button turns prominent and bounces
- [ ] Navigate away and back — output panel hydrates with previous test results, next button prominent (no confetti)
- [ ] Lesson without `problem` field — no panel rendered, no gap
- [ ] Unauthenticated — confetti still fires, no save errors

**Step 3: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: <describe any smoke test fixes>"
```

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `app/migrations/2026-02-25-lesson-player-ux.sql` | New — adds 2 columns |
| `app/src/lib/judge0.ts` | Add `visible?` to `TestCase` |
| `app/src/lib/data.ts` | Add `LessonProblem`, `UserCode` types; update `getLesson`, `getUserCode` |
| `app/src/app/api/code/save/route.ts` | Persist `last_test_results` |
| `app/src/app/dashboard/.../lesson/[order]/page.tsx` | Thread new props |
| `app/src/components/lesson/problem-panel.tsx` | New component |
| `app/src/components/lesson/code-lesson-layout.tsx` | Hydration, confetti, prominent next, ProblemPanel |
