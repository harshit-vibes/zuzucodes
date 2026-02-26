# Challenge Pane + Progress Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the challenge pane with a hint slide-over carousel + solution unlock, fix lesson intro skip on return, and add 3-state progress tracking to the sidebar.

**Architecture:** `ProblemPanel` gets a full rewrite: challenge label row has a hint button on the right, clicking it slides an overlay over the panel showing hints one at a time — last hint reveals a "view solution" button. `CodeLessonLayout` skips the intro overlay when the user has prior work (`savedCode !== null`) or has already completed the lesson. `getSectionCompletionStatus` in `data.ts` gains a third state (`in-progress`) that cascades to all callers and the sidebar.

**Tech Stack:** React, TypeScript, Next.js 15 App Router, Tailwind CSS v4, `@neondatabase/serverless`

---

## Task 1: ProblemPanel Redesign

**Files:**
- Modify: `app/src/components/lesson/problem-panel.tsx`

The entire file is a rewrite. The new design:
- Challenge label row: `challenge` label on left + lightbulb `hints` button on right (only shown when `problemHints.length > 0`)
- Challenge summary text, examples, constraint pills below — always visible
- Hint overlay: `absolute inset-0`, slides in from right via CSS `translate-x-full → translate-x-0` transition, covers the entire panel
- Overlay shows: hint counter `hint N / total`, close button, hint text, prev/next nav; last hint shows "view solution →" instead of "next →"
- New prop: `onViewSolution?: () => void` — called when "view solution" is clicked, then closes overlay

**Step 1: Replace `app/src/components/lesson/problem-panel.tsx` entirely**

```tsx
'use client';

import { useState } from 'react';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
  onViewSolution?: () => void;
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
  onViewSolution,
}: ProblemPanelProps) {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);
  const hasHints = problemHints.length > 0;
  const isLastHint = hintIndex === problemHints.length - 1;

  function handleClose() {
    setHintsOpen(false);
    setHintIndex(0);
  }

  function handleViewSolution() {
    onViewSolution?.();
    handleClose();
  }

  return (
    <div className="relative border-b border-border/50 dark:border-zinc-700/50 bg-background dark:bg-zinc-950 overflow-hidden">
      {/* Main content */}
      <div className="px-4 py-3 space-y-2.5">

        {/* Header row: label + hints button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            challenge
          </span>
          {hasHints && (
            <button
              onClick={() => setHintsOpen(true)}
              aria-label="Show hints"
              className="flex items-center gap-1 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[9px] font-mono">hints</span>
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm font-medium text-foreground/80 leading-relaxed">
          {problemSummary}
        </p>

        {/* Examples */}
        {visibleExamples.length > 0 && entryPoint && (
          <div className="space-y-1">
            {visibleExamples.map((tc, i) => (
              <div
                key={i}
                className="font-mono text-xs bg-muted/40 dark:bg-zinc-900 rounded px-2.5 py-1.5 flex items-center gap-2 border-l-2 border-primary/30"
              >
                <span className="text-foreground/70">
                  {entryPoint}({tc.args.map(a => JSON.stringify(a)).join(', ')})
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-emerald-400/90">{JSON.stringify(tc.expected)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Constraints as compact pills */}
        {problemConstraints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {problemConstraints.map((c, i) => (
              <span
                key={i}
                className="font-mono text-xs text-muted-foreground/70 ring-1 ring-border/40 rounded px-2 py-0.5"
              >
                {c}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Hint overlay — slides in from right, covers entire panel */}
      <div
        className={`absolute inset-0 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-transform duration-200 ease-out flex flex-col px-4 py-3 ${
          hintsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            hint {hintIndex + 1} / {problemHints.length}
          </span>
          <button
            onClick={handleClose}
            aria-label="Close hints"
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hint text */}
        <div className="flex-1 min-h-0">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {problemHints[hintIndex]}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3 shrink-0">
          <button
            onClick={() => setHintIndex(i => i - 1)}
            disabled={hintIndex === 0}
            className="text-xs font-mono text-muted-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← prev
          </button>
          {isLastHint ? (
            <button
              onClick={handleViewSolution}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              view solution →
            </button>
          ) : (
            <button
              onClick={() => setHintIndex(i => i + 1)}
              className="text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: type errors about missing `onViewSolution` prop in `code-lesson-layout.tsx` (will fix in Task 2). If other errors appear, investigate.

**Step 3: Commit**

```bash
git add app/src/components/lesson/problem-panel.tsx
git commit -m "feat: redesign ProblemPanel with hint slide-over carousel"
```

---

## Task 2: CodeLessonLayout — Intro Skip + Remove Toolbar Button + Wire onViewSolution

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

Three changes:

1. **`view` initial state** — line 81, change from `'intro'` to check existing progress:
```ts
// BEFORE:
const [view, setView] = useState<'intro' | 'content' | 'outro'>('intro');

// AFTER:
const [view, setView] = useState<'intro' | 'content' | 'outro'>(
  isCompleted || savedCode !== null ? 'content' : 'intro'
);
```

2. **Remove the toolbar solution button** — lines 266–271 (the `<button>` with `onClick={() => solutionCode && handleCodeChange(solutionCode)}`). Delete only that button; keep the `run` button.

3. **Pass `onViewSolution` to `ProblemPanel`** — in the `CodePane` block where `<ProblemPanel>` is rendered (around line 252), add the new prop:
```tsx
// BEFORE:
<ProblemPanel
  problemSummary={problemSummary}
  problemConstraints={problemConstraints}
  problemHints={problemHints}
  testCases={testCases}
  entryPoint={entryPoint}
/>

// AFTER:
<ProblemPanel
  problemSummary={problemSummary}
  problemConstraints={problemConstraints}
  problemHints={problemHints}
  testCases={testCases}
  entryPoint={entryPoint}
  onViewSolution={solutionCode ? () => handleCodeChange(solutionCode) : undefined}
/>
```

**Step 1: Make the three edits above**

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Manual verification**

Start dev server (`npm run dev` in `app/`). Navigate to a lesson that has hints. Verify:
- If you've previously saved code on this lesson, the intro overlay is skipped on load
- Fresh lesson (no saved code) still shows the intro
- Solution button is gone from the editor toolbar
- Hint button appears in the challenge label row; clicking it opens the slide-over
- Navigating to last hint shows "view solution →"; clicking it loads solution code and closes overlay

**Step 4: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: skip lesson intro on return, wire hint slide-over solution unlock"
```

---

## Task 3: data.ts — 3-State SectionStatus

**Files:**
- Modify: `app/src/lib/data.ts`
- Modify: `app/src/app/dashboard/layout.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`

### Step 1: Add `SectionStatus` type export in `data.ts`

Add near the top of the file, after other type exports:

```ts
export type SectionStatus = 'not-started' | 'in-progress' | 'completed';
```

### Step 2: Update `getSectionCompletionStatus` in `data.ts`

The function at line 773. Change the return type and add a `startedRows` query:

```ts
export async function getSectionCompletionStatus(
  userId: string,
  modules: Module[]
): Promise<Record<string, SectionStatus>> {
  if (modules.length === 0) return {};

  try {
    const moduleIds = modules.map(m => m.id);

    const [lessonRows, completedRows, startedRows, passedRows] = await Promise.all([
      sql`SELECT id, module_id, lesson_index FROM lessons WHERE module_id = ANY(${moduleIds})`,
      sql`
        SELECT uc.lesson_id FROM user_code uc
        JOIN lessons l ON l.id = uc.lesson_id
        WHERE uc.user_id = ${userId}
          AND uc.passed_at IS NOT NULL
          AND l.module_id = ANY(${moduleIds})
      `,
      sql`
        SELECT DISTINCT uc.lesson_id FROM user_code uc
        JOIN lessons l ON l.id = uc.lesson_id
        WHERE uc.user_id = ${userId}
          AND uc.passed_at IS NULL
          AND l.module_id = ANY(${moduleIds})
      `,
      sql`
        SELECT DISTINCT module_id FROM user_quiz_attempts
        WHERE user_id = ${userId} AND module_id = ANY(${moduleIds}) AND passed = true
      `,
    ]);

    const completedSet = new Set((completedRows as any[]).map(r => r.lesson_id));
    const startedSet = new Set((startedRows as any[]).map(r => r.lesson_id));
    const passedQuizSet = new Set((passedRows as any[]).map(r => r.module_id));
    const result: Record<string, SectionStatus> = {};

    for (const m of modules) {
      for (const l of (lessonRows as any[]).filter(l => l.module_id === m.id)) {
        result[`${m.id}:lesson-${l.lesson_index}`] = completedSet.has(l.id)
          ? 'completed'
          : startedSet.has(l.id)
          ? 'in-progress'
          : 'not-started';
      }
      if (m.quiz_form) {
        result[`${m.id}:quiz`] = passedQuizSet.has(m.id) ? 'completed' : 'not-started';
      }
    }

    return result;
  } catch (error) {
    console.error('getSectionCompletionStatus error:', error);
    return {};
  }
}
```

### Step 3: Fix `app/src/app/dashboard/layout.tsx`

Line 30 — update the empty fallback type:

```ts
// BEFORE:
: Promise.resolve({}),

// AFTER:
: Promise.resolve({} as Record<string, SectionStatus>),
```

Also add the import at the top:
```ts
import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getDashboardStats, type SectionStatus } from "@/lib/data";
```

### Step 4: Fix `app/src/app/dashboard/course/[courseSlug]/page.tsx`

This file uses `completionStatus[key]` as a boolean in several places. All boolean usages must become `=== 'completed'`.

Import:
```ts
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseFormResponse,
  type SectionStatus,
} from '@/lib/data';
```

Line 30 — update type cast:
```ts
// BEFORE:
: Promise.resolve({} as Record<string, boolean>),
// AFTER:
: Promise.resolve({} as Record<string, SectionStatus>),
```

Line 47 — inside the `for` loop (`if (completionStatus[...])`):
```ts
// BEFORE:
if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`]) completedItems++;
// AFTER:
if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed') completedItems++;
```

Line 49 — quiz check:
```ts
// BEFORE:
if (mod.quiz_form && completionStatus[`${mod.id}:quiz`]) completedItems++;
// AFTER:
if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] === 'completed') completedItems++;
```

Line 60 — resume href loop:
```ts
// BEFORE:
if (!completionStatus[`${mod.id}:lesson-${l.lesson_index}`]) {
// AFTER:
if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] !== 'completed') {
```

Line 65 — quiz resume check:
```ts
// BEFORE:
if (mod.quiz_form && !completionStatus[`${mod.id}:quiz`]) {
// AFTER:
if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] !== 'completed') {
```

Line 188 — `lessonsDone` filter in curriculum section:
```ts
// BEFORE:
const lessonsDone = lessons.filter(
  l => completionStatus[`${mod.id}:lesson-${l.lesson_index}`]
).length;
// AFTER:
const lessonsDone = lessons.filter(
  l => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed'
).length;
```

Line 190 — `quizDone`:
```ts
// BEFORE:
const quizDone = mod.quiz_form ? completionStatus[`${mod.id}:quiz`] ?? false : null;
// AFTER:
const quizDone = mod.quiz_form ? (completionStatus[`${mod.id}:quiz`] ?? 'not-started') === 'completed' : null;
```

Line 235 — lesson row `done`:
```ts
// BEFORE:
const done = completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? false;
// AFTER:
const done = (completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? 'not-started') === 'completed';
```

### Step 5: Fix `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`

Import:
```ts
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  type SectionStatus,
} from '@/lib/data';
```

Line 38 — type cast:
```ts
// BEFORE:
: ({} as Record<string, boolean>);
// AFTER:
: ({} as Record<string, SectionStatus>);
```

Line 41 — `lessonsDone`:
```ts
// BEFORE:
const lessonsDone = lessons.filter(
  (l) => completionStatus[`${mod.id}:lesson-${l.lesson_index}`]
).length;
// AFTER:
const lessonsDone = lessons.filter(
  (l) => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed'
).length;
```

Line 44 — `quizDone`:
```ts
// BEFORE:
const quizDone = mod.quiz_form
  ? (completionStatus[`${mod.id}:quiz`] ?? false)
  : false;
// AFTER:
const quizDone = mod.quiz_form
  ? (completionStatus[`${mod.id}:quiz`] ?? 'not-started') === 'completed'
  : false;
```

Line 55 — resume href loop:
```ts
// BEFORE:
if (!completionStatus[`${mod.id}:lesson-${l.lesson_index}`]) {
// AFTER:
if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] !== 'completed') {
```

Line 60 — quiz resume check (look for `&& !quizDone` — `quizDone` is already boolean after fix above, so no change needed there).

Line 159 — lesson row `done`:
```ts
// BEFORE:
const done =
  completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? false;
// AFTER:
const done =
  (completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? 'not-started') === 'completed';
```

### Step 6: Type-check

```bash
cd app && npx tsc --noEmit
```

Expected: no errors. If there are remaining boolean coercion errors, find them with the TypeScript output and apply the same `=== 'completed'` pattern.

### Step 7: Commit

```bash
git add app/src/lib/data.ts \
        app/src/app/dashboard/layout.tsx \
        app/src/app/dashboard/course/[courseSlug]/page.tsx \
        app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx
git commit -m "feat: 3-state SectionStatus (not-started/in-progress/completed)"
```

---

## Task 4: AppSidebar — 3-State Visual

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`

### Changes

**1. Import `SectionStatus`**

```ts
import type { CourseWithModules, SidebarCourseProgress, DashboardStats, SectionStatus } from "@/lib/data";
```

**2. Update `AppSidebarProps` type**

```ts
// BEFORE:
contentCompletion?: Record<string, boolean>;
// AFTER:
contentCompletion?: Record<string, SectionStatus>;
```

**3. Update `ModuleSection` prop type**

```ts
// BEFORE:
contentCompletion: Record<string, boolean>;
// AFTER:
contentCompletion: Record<string, SectionStatus>;
```

**4. Update `completedCount` in `ModuleSection`**

```ts
// BEFORE:
const completedCount = module.contentItems.filter((item) => {
  const key = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
  return contentCompletion[key];
}).length;

// AFTER:
const completedCount = module.contentItems.filter((item) => {
  const key = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
  return (contentCompletion[key] ?? 'not-started') === 'completed';
}).length;
```

**5. Add module status computation and tint logic in `ModuleSection`**

After the `completedCount` block, add:

```ts
// Compute module completion/progress for tint
const allItemStatuses = module.contentItems.map(item => {
  const key = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
  return contentCompletion[key] ?? 'not-started';
});
const moduleCompleted = allItemStatuses.length > 0 && allItemStatuses.every(s => s === 'completed');
```

Update the wrapper div:

```tsx
// BEFORE:
<div className={isActiveModule ? 'rounded-lg bg-primary/5 ring-1 ring-primary/10 px-1 py-1' : ''}>

// AFTER:
<div className={
  isActiveModule
    ? 'rounded-lg bg-primary/5 ring-1 ring-primary/10 px-1 py-1'
    : moduleCompleted
    ? 'rounded-lg bg-success/5 ring-1 ring-success/10 px-1 py-1'
    : ''
}>
```

**6. Update lesson item rendering — 3-state dots + text color**

In the `module.contentItems.map` block, replace the current logic:

```tsx
// BEFORE:
const isCompleted = contentCompletion[completionKey] ?? false;
// ...
className={cn(
  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
  isActive
    ? "bg-primary/10 text-primary font-medium"
    : isCompleted
      ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
)}
// ...icon block:
{isActive ? (
  <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
) : item.type === "quiz" ? (
  <Diamond className="h-3.5 w-3.5 shrink-0" />
) : (
  <FileText className="h-3.5 w-3.5 shrink-0" />
)}

// AFTER:
const itemStatus = (contentCompletion[completionKey] ?? 'not-started') as SectionStatus;
const isCompleted = itemStatus === 'completed';
// ...
className={cn(
  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
  isActive
    ? "bg-primary/10 text-primary font-medium"
    : isCompleted
    ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
    : itemStatus === 'in-progress'
    ? "text-foreground/80 hover:text-foreground hover:bg-muted/40"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
)}
// ...icon block:
{isActive ? (
  <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
) : item.type === "quiz" ? (
  <Diamond className={cn("h-3.5 w-3.5 shrink-0", isCompleted ? "text-success" : "text-muted-foreground/40")} />
) : isCompleted ? (
  <div className="h-3 w-3 rounded-full bg-success/70 shrink-0" />
) : itemStatus === 'in-progress' ? (
  <div className="h-3 w-3 rounded-full ring-1 ring-primary/50 bg-primary/10 shrink-0" />
) : (
  <div className="h-3 w-3 rounded-full ring-1 ring-border/40 shrink-0" />
)}
```

You can remove the `FileText` import from lucide-react if it's no longer used elsewhere in the file.

### Step 1: Make all the changes above

### Step 2: Type-check

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

### Step 3: Manual verification

Open the sidebar in the course player. Verify:
- Lessons not yet visited: empty ring dot
- Lessons with code saved but not passed: primary-tinted ring dot
- Completed lessons: filled success dot
- Module with all items complete: success-tinted container
- Quiz dots: success colored when complete, muted when not

### Step 4: Commit

```bash
git add app/src/components/shared/app-sidebar.tsx
git commit -m "feat: 3-state sidebar progress (not-started/in-progress/completed)"
```
