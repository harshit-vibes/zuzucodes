# Course Preview Dialog Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visually upgrade the `CourseOverviewDialog` with a richer header, a "What you'll learn" outcomes section, and a redesigned module list showing real lesson titles and mini progress bars.

**Architecture:** Two files change. The detail API is extended to return `description` and `lessonTitles` per module (both derivable in-memory from already-loaded data). The dialog component is rewritten to consume those fields and apply the new visual design.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui, Lucide React.

---

## Task 1: Extend the detail API

**Files:**
- Modify: `app/src/app/api/courses/[courseId]/detail/route.ts`

**Context:**
The route currently returns this shape per module:
```typescript
interface ModuleDetail {
  id: string;
  title: string;
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
}
```
`getCourseWithModules` already loads `module.description` and `module.mdx_content`
in memory. We just need to expose them in the response.

**Step 1: Update the `ModuleDetail` interface**

In the route file, change the interface to:
```typescript
interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;      // NEW
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
  lessonTitles: string[];           // NEW — real headings from MDX
}
```

**Step 2: Add the import for `getMdxSectionTitles`**

At the top of the file add:
```typescript
import { getMdxSectionTitles } from '@/lib/mdx-utils';
```

**Step 3: Populate the new fields in `moduleDetails` mapping**

Replace the existing `course.modules.map(...)` block with:
```typescript
const moduleDetails: ModuleDetail[] = course.modules.map((m) => {
  const lessonCompletion: boolean[] = [];
  for (let i = 0; i < m.section_count; i++) {
    lessonCompletion.push(completionStatus[`${m.id}:lesson-${i}`] ?? false);
  }
  const quizCompleted = completionStatus[`${m.id}:quiz`] ?? false;

  const lessonTitles = m.mdx_content
    ? getMdxSectionTitles(m.mdx_content)
    : Array.from({ length: m.section_count }, (_, i) => `Lesson ${i + 1}`);

  return {
    id: m.id,
    title: m.title,
    description: m.description,
    section_count: m.section_count,
    has_quiz: !!m.quiz_form,
    lessonCompletion,
    quizCompleted,
    lessonTitles,
  };
});
```

**Step 4: Type-check**
```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**
```bash
git add app/src/app/api/courses/\[courseId\]/detail/route.ts
git commit -m "feat: add description and lessonTitles to detail API response"
```

---

## Task 2: Rewrite the dialog component

**Files:**
- Modify: `app/src/components/dashboard/course-overview-dialog.tsx`

**Context:**
- The existing dialog lives in this file at `max-w-md`.
- `course.outcomes` (`string[] | null`) and `course.tag` are already available on the `course` prop — no extra fetch needed.
- `titleCase` is a util exported from `@/lib/utils` (already used in `course-grid.tsx`).
- `label-mono` is a custom Tailwind utility class defined globally (used in the lesson page header).
- The `CompletionIcon` and `ModuleStatusBadge` helpers at the bottom of the file will be replaced/refactored.

**Step 1: Update the `ModuleDetail` interface in the component to match the API**

Change the interface at the top of the file:
```typescript
interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
  lessonTitles: string[];
}
```

**Step 2: Update imports**

Replace the existing import block with:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';
import { titleCase } from '@/lib/utils';
import type { Course, CourseProgress } from '@/lib/data';
```

(`Minus` is no longer needed — empty lessons will use an empty circle drawn inline.)

**Step 3: Replace the full component JSX**

Replace everything from `return (` inside `CourseOverviewDialog` through the closing `);` with:

```typescript
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 gap-0">

        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          {course.tag && (
            <span className="inline-block mb-2 w-fit px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {titleCase(course.tag)}
            </span>
          )}
          <DialogTitle className="text-xl font-semibold leading-snug">
            {course.title}
          </DialogTitle>
          {course.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {course.description}
            </p>
          )}
          {progressValue > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <Progress value={progressValue} className="flex-1 h-1.5" />
              <span className="text-xs font-medium text-primary tabular-nums">
                {progressValue}%
              </span>
              <StatusBadge status={status} />
            </div>
          )}
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* What you'll learn */}
          {course.outcomes && course.outcomes.length > 0 && (
            <section>
              <p className="label-mono text-muted-foreground mb-3">What you&apos;ll learn</p>
              <div className={`grid gap-x-4 gap-y-2 ${course.outcomes.length >= 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {course.outcomes.map((outcome, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </span>
                    <span className="text-sm text-foreground/90 leading-snug">{outcome}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Divider before curriculum */}
          {course.outcomes && course.outcomes.length > 0 && (
            <hr className="border-border/50" />
          )}

          {/* Curriculum */}
          {loading && <ModuleSkeletons />}

          {!loading && data && (
            <section className="space-y-3">
              <p className="label-mono text-muted-foreground">Curriculum</p>
              {data.modules.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} />
              ))}
            </section>
          )}
        </div>

        {/* ── Footer CTA ──────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border/50 flex-shrink-0">
          <button
            onClick={handleCta}
            disabled={!data}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ctaLabel}
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
```

**Step 4: Replace the helper components at the bottom of the file**

Delete `CompletionIcon`, `ModuleStatusBadge`, and `ModuleSkeletons`. Replace them with:

```typescript
// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'not_started' | 'in_progress' | 'completed' }) {
  if (status === 'in_progress') {
    return (
      <span className="flex-shrink-0 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
        In Progress
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="flex-shrink-0 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
        Completed
      </span>
    );
  }
  return null;
}

function ModuleCard({ mod }: { mod: ModuleDetail }) {
  const lessonsDone = mod.lessonCompletion.filter(Boolean).length;
  const quizDone = mod.has_quiz && mod.quizCompleted ? 1 : 0;
  const total = mod.section_count + (mod.has_quiz ? 1 : 0);
  const completedCount = lessonsDone + quizDone;
  const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;
  const allDone = total > 0 && completedCount === total;
  const inProgress = completedCount > 0 && !allDone;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
      {/* Module header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium leading-snug">{mod.title}</span>
            {allDone && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Done
              </span>
            )}
          </div>
          {mod.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
              {mod.description}
            </p>
          )}
        </div>
        {inProgress && (
          <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
            {completedCount}/{total}
          </span>
        )}
      </div>

      {/* Mini progress bar — only when in progress */}
      {inProgress && (
        <div className="h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/50 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Lesson + quiz rows */}
      <div className="space-y-1">
        {Array.from({ length: mod.section_count }, (_, i) => {
          const done = mod.lessonCompletion[i] ?? false;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <LessonIcon done={done} />
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                {mod.lessonTitles[i] || `Lesson ${i + 1}`}
              </span>
            </div>
          );
        })}
        {mod.has_quiz && (
          <div className="flex items-center gap-2 text-xs">
            <LessonIcon done={mod.quizCompleted} />
            <span className={mod.quizCompleted ? 'text-foreground' : 'text-muted-foreground'}>
              Quiz
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
        <Check className="w-2.5 h-2.5 text-primary" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-border/60" />
  );
}

function ModuleSkeletons() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-3 w-24" />
      {[1, 2].map((n) => (
        <div key={n} className="rounded-lg border border-border/60 p-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 ml-0" />
          <Skeleton className="h-3 w-48 ml-0" />
          <Skeleton className="h-3 w-40 ml-0" />
        </div>
      ))}
    </section>
  );
}
```

**Step 5: Type-check**
```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 6: Visual check in browser**
```bash
npm run dev   # if not already running
```
Open `http://localhost:3000/dashboard`, click a course card. Verify:
- Dialog is wider
- Tag chip appears above title (if course has a tag)
- Outcomes section appears below the header (if course has outcomes)
- Module cards are bordered with padding
- Lesson titles show real headings instead of "Lesson 1, Lesson 2"
- Module descriptions appear in muted text (if set)
- Mini progress bar shows for in-progress modules
- "Done" pill appears for completed modules

**Step 7: Lint check**
```bash
npm run lint 2>&1 | grep "course-overview-dialog"
```
Expected: no new errors on our file.

**Step 8: Commit**
```bash
git add app/src/components/dashboard/course-overview-dialog.tsx
git commit -m "feat: redesign course overview dialog with richer layout and lesson titles"
```

---

## Verification Checklist

1. TypeScript: `npx tsc --noEmit` — zero errors
2. Tag chip visible when `course.tag` is set
3. Outcomes grid renders (1-col for <4 outcomes, 2-col for ≥4)
4. Module cards have visible border and padding
5. Lesson rows show real MDX heading titles, not "Lesson N"
6. Module description appears in muted text below title
7. Mini progress bar appears for in-progress modules
8. "Done" badge appears for fully completed modules
9. CTA button (Start / Continue / Review) still works
10. Back button / dialog close still works
