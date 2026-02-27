# Course Player Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix three sidebar progress bugs, add quiz upsert, remove lesson footer, add review pill and celebration confetti, and build the confidence form + report card + certificate onboarding/offboarding experience.

**Architecture:** Bugs fixed in `app-sidebar.tsx` and `code-lesson-layout.tsx`; quiz upsert via DB migration + API change; confidence form replaces MCQ `CourseForm` with Likert `ConfidenceForm` (per-course JSONB column), rendered in a rewritten `LikertFormPlayer`; `ReportCard` computes deltas from stored responses; `CourseCertificate` uses dynamic-imported `html2canvas` + `jspdf` for client-side PDF download.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Neon PostgreSQL (raw SQL), `canvas-confetti` (already installed), `html2canvas`, `jspdf`

---

## Context for all tasks

**Key files:**
- `app/src/components/shared/app-sidebar.tsx` — sidebar lesson dots
- `app/src/components/lesson/code-lesson-layout.tsx` — lesson player (client component)
- `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx` — quiz player (client component)
- `app/src/app/api/quiz/submit/route.ts` — quiz submit API
- `app/src/lib/data.ts` — all DB access; `CourseForm` interface lives here
- `app/src/app/dashboard/course/[courseSlug]/page.tsx` — course overview page (Server Component)
- `app/src/components/dashboard/course-form.tsx` — current MCQ `CourseFormPlayer` (needs full rewrite)
- `app/src/components/dashboard/course-form-wrappers.tsx` — `OnboardingFormWrapper` + `CompletionFormWrapper`
- `app/migrations/` — SQL migration files (run manually against Neon: `psql $DATABASE_URL -f <file>`)
- `app/scripts/seed-content.ts` — seeds course + lesson content (run: `npx tsx app/scripts/seed-content.ts`)
- `app/scripts/validate-content.mjs` — validates DB content (run: `node app/scripts/validate-content.mjs`)

**Type-check command:** `cd app && npx tsc --noEmit`

**No automated tests** — verify with `npx tsc --noEmit` after each task, then visually in the browser (`npm run dev`).

---

## Task 1: Fix sidebar icon size jitter + active+completed colour conflict

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx` (lines ~153–163)

**Context:** The three `<div>` dots for lesson status use `h-3 w-3` (12px) while `CircleDot` uses `h-3.5 w-3.5` (14px) — 2px layout shift on navigation. Also when a lesson is both active AND completed, the icon shows `text-primary` instead of `text-success`, losing the completion signal.

**Step 1: Replace the icon rendering block**

Find the block that starts with:
```tsx
{isActive ? (
  <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
```

Replace the entire icon conditional (the `{isActive ? ... : ...}` block) with:

```tsx
{isActive ? (
  <CircleDot className={cn("h-3.5 w-3.5 shrink-0", isCompleted ? "text-success" : "text-primary")} />
) : item.type === "quiz" ? (
  <Diamond className={cn("h-3.5 w-3.5 shrink-0", isCompleted ? "text-success" : "text-muted-foreground/40")} />
) : isCompleted ? (
  <div className="h-3.5 w-3.5 rounded-full bg-success/70 shrink-0" />
) : itemStatus === 'in-progress' ? (
  <div className="h-3.5 w-3.5 rounded-full ring-1 ring-primary/50 bg-primary/10 shrink-0" />
) : (
  <div className="h-3.5 w-3.5 rounded-full ring-1 ring-border/40 shrink-0" />
)}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/components/shared/app-sidebar.tsx
git commit -m "fix: sidebar lesson dots — uniform icon size + completed colour when active"
```

---

## Task 2: Fix stale sidebar + lesson player tweaks (footer removal, review pill, router.refresh)

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Context:** Three changes in one file:
1. `router.refresh()` after lesson pass — forces layout RSC to re-fetch completion data, fixing stale sidebar dots
2. Remove the `h-11` "wrap up →" footer (outro reached via sidebar only)
3. Replace `isCompleted` checkmark icon in header with a compact "completed" pill inline with the lesson title

**Step 1: Add `useRouter` import and instantiate**

Add to the existing `import` from `'next/navigation'` line (or add a new import):
```tsx
import { useRouter } from 'next/navigation';
```

Add inside the component body (near the top with other state declarations):
```tsx
const router = useRouter();
```

**Step 2: Call `router.refresh()` on lesson pass**

Find the block:
```tsx
if (testResult.allPassed) {
  confetti({
```

Add `router.refresh();` as the first line inside that `if` block:
```tsx
if (testResult.allPassed) {
  router.refresh();
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 1 },
    colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
    disableForReducedMotion: true,
  });
  if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
  viewTimerRef.current = setTimeout(() => setView('outro'), 1800);
}
```

**Step 3: Remove the Footer**

Delete the entire `const Footer = (...)` block (the `shrink-0 h-11` footer with "wrap up →").

Remove `{Footer}` from the layout JSX (it appears twice — once in the mobile layout and once in the desktop layout — remove both).

**Step 4: Replace checkmark icon with "completed" pill**

Find in the header's flex items area:
```tsx
{isCompleted && (
  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-success/15 ring-1 ring-success/40" title="Lesson complete">
    <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
)}
```

Delete this block entirely.

Then in the lesson title area, add the pill after `{lessonTitle}`:
```tsx
<div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
  <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider uppercase hidden sm:block shrink-0">
    {moduleTitle}
  </span>
  <span className="text-border/40 hidden sm:block shrink-0 text-xs">/</span>
  <span className="text-sm font-medium text-foreground truncate">{lessonTitle}</span>
  {isCompleted && (
    <span className="hidden sm:block font-mono text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/70 ring-1 ring-success/20 shrink-0">
      completed
    </span>
  )}
</div>
```

**Step 5: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: lesson player — router.refresh on pass, remove footer, completed pill in header"
```

---

## Task 3: Quiz upsert DB migration

**Files:**
- Create: `app/migrations/2026-02-27-quiz-upsert.sql`

**Context:** `user_quiz_attempts` currently appends a new row per submission. Add `UNIQUE(user_id, module_id)` to enable ON CONFLICT upsert (mirrors `user_code` pattern). Must delete duplicates first.

**Step 1: Create migration file**

```sql
-- 2026-02-27: Quiz upsert — one row per (user_id, module_id), mirrors user_code pattern

BEGIN;

-- Remove duplicate attempts, keep only the latest per (user_id, module_id)
DELETE FROM user_quiz_attempts a
USING user_quiz_attempts b
WHERE a.user_id = b.user_id
  AND a.module_id = b.module_id
  AND a.attempted_at < b.attempted_at;

-- Add unique constraint enabling ON CONFLICT upsert
ALTER TABLE user_quiz_attempts
  ADD CONSTRAINT uqa_user_module_unique UNIQUE (user_id, module_id);

COMMIT;
```

**Step 2: Run against DB**

```bash
psql $DATABASE_URL -f app/migrations/2026-02-27-quiz-upsert.sql
```

Expected output:
```
BEGIN
DELETE N
ALTER TABLE
COMMIT
```

**Step 3: Commit**

```bash
git add app/migrations/2026-02-27-quiz-upsert.sql
git commit -m "feat: quiz upsert migration — unique(user_id, module_id) on user_quiz_attempts"
```

---

## Task 4: Quiz API — change INSERT to upsert

**Files:**
- Modify: `app/src/app/api/quiz/submit/route.ts`

**Context:** The POST handler currently does a plain `INSERT`. Change to `INSERT ... ON CONFLICT DO UPDATE` to match the new unique constraint.

**Step 1: Replace the INSERT block**

Find:
```ts
await sql`
  INSERT INTO user_quiz_attempts (user_id, module_id, score_percent, passed, answers, attempted_at)
  VALUES (${userId}, ${moduleId}, ${score}, ${passed}, ${JSON.stringify(answers)}::JSONB, NOW())
`;
```

Replace with:
```ts
await sql`
  INSERT INTO user_quiz_attempts (user_id, module_id, score_percent, passed, answers, attempted_at)
  VALUES (${userId}, ${moduleId}, ${score}, ${passed}, ${JSON.stringify(answers)}::JSONB, NOW())
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    score_percent = EXCLUDED.score_percent,
    passed        = EXCLUDED.passed,
    answers       = EXCLUDED.answers,
    attempted_at  = EXCLUDED.attempted_at
`;
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/app/api/quiz/submit/route.ts
git commit -m "feat: quiz submit — upsert instead of INSERT (one row per user+module)"
```

---

## Task 5: Quiz player — confetti on pass + router.refresh + module completion burst

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx`

**Context:** Add `router.refresh()` after quiz pass (same as lesson player), fire confetti on first-time pass, fire a wider dual-origin burst to signal module completion. `canvas-confetti` is already installed. `isAlreadyPassed` prop correctly identifies first-time passes.

**Step 1: Add imports**

At the top of the file, add:
```ts
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
```

**Step 2: Instantiate router**

Add inside the component body (after the `useState` declarations):
```ts
const router = useRouter();
```

**Step 3: Fire confetti + refresh after submit resolves**

In `handleSubmit`, find:
```ts
const data = await res.json();
setResult(data);
```

Add immediately after `setResult(data)`:
```ts
if (data.passed) {
  router.refresh();
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.5, y: 1 },
    colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
    disableForReducedMotion: true,
  });
  // Module completion burst — only on first-time pass
  if (!isAlreadyPassed) {
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.8 }, disableForReducedMotion: true });
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.8 }, disableForReducedMotion: true });
    }, 300);
  }
}
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx
git commit -m "feat: quiz player — confetti + module completion burst + router.refresh on pass"
```

---

## Task 6: Confidence form DB migration

**Files:**
- Create: `app/migrations/2026-02-27-confidence-form.sql`

**Context:** Drop the old MCQ `onboarding_form` + `completion_form` columns (and their weak CHECK constraints). Add a single `confidence_form` JSONB column with a strict CHECK constraint enforcing the `ConfidenceForm` schema (title + non-empty questions array). Column starts nullable — the seed script will populate all rows.

**Step 1: Create migration file**

```sql
-- 2026-02-27: Replace onboarding_form + completion_form with single confidence_form (Likert schema)

BEGIN;

-- Drop old weak constraints
ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_onboarding_is_object,
  DROP CONSTRAINT IF EXISTS courses_completion_is_object;

-- Drop old MCQ form columns
ALTER TABLE courses
  DROP COLUMN IF EXISTS onboarding_form,
  DROP COLUMN IF EXISTS completion_form;

-- Add confidence_form (nullable — seed populates values; validate-content enforces non-null)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS confidence_form JSONB;

-- Strict CHECK: must have title (string) + questions (non-empty array)
ALTER TABLE courses
  ADD CONSTRAINT courses_confidence_form_check CHECK (
    confidence_form IS NULL OR (
      confidence_form ? 'title'
      AND confidence_form ? 'questions'
      AND jsonb_typeof(confidence_form->'questions') = 'array'
      AND jsonb_array_length(confidence_form->'questions') >= 1
    )
  );

COMMIT;
```

**Step 2: Run against DB**

```bash
psql $DATABASE_URL -f app/migrations/2026-02-27-confidence-form.sql
```

Expected output: `BEGIN`, `ALTER TABLE` (×4), `COMMIT`

**Step 3: Commit**

```bash
git add app/migrations/2026-02-27-confidence-form.sql
git commit -m "feat: confidence form migration — drop onboarding/completion_form, add confidence_form"
```

---

## Task 7: data.ts — ConfidenceForm type + getCourseConfidenceResponses

**Files:**
- Modify: `app/src/lib/data.ts`

**Context:** Replace the `CourseForm` MCQ interface with `ConfidenceForm` (Likert). Update the `Course` interface. Add `getCourseConfidenceResponses` which fetches both onboarding and completion responses in one query.

**Step 1: Replace `CourseForm` with `ConfidenceForm`**

Find and delete:
```ts
export interface CourseForm {
  title: string;
  questions: {
    id: string;
    statement: string;
    options: { id: string; text: string }[];
  }[];
}
```

Replace with:
```ts
export interface ConfidenceQuestion {
  id: string;
  statement: string;
}

export interface ConfidenceForm {
  title: string;
  questions: ConfidenceQuestion[];
}
```

**Step 2: Update `Course` interface**

Find in the `Course` interface:
```ts
  onboarding_form: CourseForm | null;
  completion_form: CourseForm | null;
```

Replace with:
```ts
  confidence_form: ConfidenceForm | null;
```

**Step 3: Add `getCourseConfidenceResponses`**

Add this function after `submitCourseFormResponse`:

```ts
/**
 * Fetch both onboarding and completion confidence responses for a user+course.
 * Returns null for each form_type if not yet submitted.
 */
export async function getCourseConfidenceResponses(
  userId: string,
  courseId: string,
): Promise<{ onboarding: Record<string, number> | null; completion: Record<string, number> | null }> {
  try {
    const rows = await sql`
      SELECT form_type, responses
      FROM user_course_form_responses
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
    const onboarding = (rows.find((r: any) => r.form_type === 'onboarding')?.responses ?? null) as Record<string, number> | null;
    const completion = (rows.find((r: any) => r.form_type === 'completion')?.responses ?? null) as Record<string, number> | null;
    return { onboarding, completion };
  } catch (error) {
    console.error('getCourseConfidenceResponses error:', error);
    return { onboarding: null, completion: null };
  }
}
```

**Step 4: Update `getCourseWithModules` SQL SELECT**

Find the query inside `getCourseWithModules` that selects course columns. It currently selects `onboarding_form, completion_form`. Change to:
```sql
confidence_form
```
(remove `onboarding_form, completion_form`, add `confidence_form`)

**Step 5: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: errors pointing to files that still reference `CourseForm`, `onboarding_form`, or `completion_form` — fix each in subsequent tasks. Document which files error.

**Step 6: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: data.ts — ConfidenceForm type, getCourseConfidenceResponses, drop CourseForm"
```

---

## Task 8: Rewrite CourseFormPlayer → LikertFormPlayer

**Files:**
- Modify: `app/src/components/dashboard/course-form.tsx` (full rewrite)

**Context:** The existing `CourseFormPlayer` is MCQ-style (one question at a time with A/B/C/D options). Replace entirely with `LikertFormPlayer`: shows all questions at once, each with a 1–5 button row.

**Step 1: Replace entire file contents**

```tsx
'use client';

import { useState } from 'react';
import type { ConfidenceForm } from '@/lib/data';

interface LikertFormPlayerProps {
  courseId: string;
  formType: 'onboarding' | 'completion';
  form: ConfidenceForm;
  onComplete: () => void;
}

export function LikertFormPlayer({
  courseId,
  formType,
  form,
  onComplete,
}: LikertFormPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAnswered = Object.keys(answers).length === form.questions.length;

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/course/form-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, formType, responses: answers }),
      });
      onComplete();
    } catch {
      onComplete(); // fail open — don't block UX
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          {formType === 'onboarding' ? 'Before you begin' : "Now that you're done"}
        </p>
        <h2 className="text-base font-semibold text-foreground">{form.title}</h2>
      </div>

      {/* All questions */}
      <div className="space-y-6">
        {form.questions.map((q, i) => {
          const selected = answers[q.id];
          return (
            <div key={q.id}>
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                <span className="font-mono text-[10px] text-muted-foreground/40 mr-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {q.statement}
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    className={`flex-1 h-9 rounded-lg border-2 text-xs font-mono transition-all ${
                      selected === val
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground/40 font-mono">Not confident</span>
                <span className="text-[10px] text-muted-foreground/40 font-mono">Very confident</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
        className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving···' : 'Submit →'}
      </button>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/dashboard/course-form.tsx
git commit -m "feat: rewrite CourseFormPlayer → LikertFormPlayer (1–5 confidence scale)"
```

---

## Task 9: Update course-form-wrappers.tsx

**Files:**
- Modify: `app/src/components/dashboard/course-form-wrappers.tsx`

**Context:** Update type references from `CourseForm` → `ConfidenceForm` and component import from `CourseFormPlayer` → `LikertFormPlayer`.

**Step 1: Replace entire file contents**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LikertFormPlayer } from './course-form';
import type { ConfidenceForm } from '@/lib/data';

export function OnboardingFormWrapper({
  courseId,
  form,
}: {
  courseId: string;
  form: ConfidenceForm;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">Thanks! Ready to start?</p>
        <button
          onClick={() => router.refresh()}
          className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Start course →
        </button>
      </div>
    );
  }

  return (
    <LikertFormPlayer
      courseId={courseId}
      formType="onboarding"
      form={form}
      onComplete={() => setDone(true)}
    />
  );
}

export function CompletionFormWrapper({
  courseId,
  form,
}: {
  courseId: string;
  form: ConfidenceForm;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
        <p className="text-sm font-medium text-foreground mb-1">Course complete!</p>
        <p className="text-xs text-muted-foreground">Your confidence data has been saved.</p>
      </div>
    );
  }

  return (
    <LikertFormPlayer
      courseId={courseId}
      formType="completion"
      form={form}
      onComplete={() => setDone(true)}
    />
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/dashboard/course-form-wrappers.tsx
git commit -m "fix: course-form-wrappers — use ConfidenceForm + LikertFormPlayer"
```

---

## Task 10: ReportCard component

**Files:**
- Create: `app/src/components/dashboard/report-card.tsx`

**Step 1: Create the file**

```tsx
import type { ConfidenceQuestion } from '@/lib/data';

interface ReportCardProps {
  questions: ConfidenceQuestion[];
  onboarding: Record<string, number>;
  completion: Record<string, number>;
}

export function ReportCard({ questions, onboarding, completion }: ReportCardProps) {
  const avgDelta =
    questions.length > 0
      ? questions.reduce(
          (sum, q) => sum + ((completion[q.id] ?? 0) - (onboarding[q.id] ?? 0)),
          0,
        ) / questions.length
      : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          Your progress
        </p>
        <h2 className="text-base font-semibold text-foreground">Confidence Report</h2>
      </div>

      <div className="space-y-4">
        {questions.map(q => {
          const before = onboarding[q.id] ?? 0;
          const after = completion[q.id] ?? 0;
          const delta = after - before;

          return (
            <div key={q.id} className="space-y-1.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{q.statement}</p>
              <div className="flex items-center gap-3">
                {/* Before dots */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i <= before ? 'bg-muted-foreground/40' : 'bg-muted-foreground/10'
                      }`}
                    />
                  ))}
                </div>

                <svg
                  className="w-3 h-3 text-muted-foreground/30 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* After dots */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i <= after ? 'bg-success/70' : 'bg-muted-foreground/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Delta badge */}
                <span
                  className={`font-mono text-[11px] shrink-0 ${
                    delta > 0
                      ? 'text-success'
                      : delta === 0
                      ? 'text-muted-foreground/40'
                      : 'text-destructive'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta === 0 ? '=' : `${delta}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Average */}
      <div className="pt-3 border-t border-border/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Average improvement</span>
        <span
          className={`font-mono text-sm font-semibold ${
            avgDelta > 0 ? 'text-success' : 'text-muted-foreground'
          }`}
        >
          {avgDelta > 0 ? '+' : ''}
          {avgDelta.toFixed(1)} pts
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/dashboard/report-card.tsx
git commit -m "feat: ReportCard — before/after confidence delta display"
```

---

## Task 11: CourseCertificate component

**Files:**
- Create: `app/src/components/dashboard/course-certificate.tsx`

**Context:** `html2canvas` + `jspdf` are dynamically imported on button click (no bundle impact until needed). The certificate `div` is rendered on-page; the download button is outside the `div` so it's not captured in the PDF.

**Step 1: Install packages**

```bash
cd app && npm install html2canvas jspdf
```

**Step 2: Create the file**

```tsx
'use client';

import { useRef } from 'react';

interface CourseCertificateProps {
  studentName: string;
  courseTitle: string;
  completionDate: string;
}

export function CourseCertificate({
  studentName,
  courseTitle,
  completionDate,
}: CourseCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!certRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${courseTitle.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Certificate card — this div is captured by html2canvas */}
      <div
        ref={certRef}
        className="rounded-xl border-2 border-border/40 bg-background p-10 text-center space-y-5"
      >
        <p className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em]">
          zuzu.codes
        </p>

        <div className="w-12 h-px bg-border/40 mx-auto" />

        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
          Certificate of Completion
        </p>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground/50">This certifies that</p>
          <p className="text-2xl font-semibold text-foreground">{studentName}</p>
          <p className="text-xs text-muted-foreground/50">has successfully completed</p>
          <p className="text-xl font-semibold text-foreground mt-1">{courseTitle}</p>
        </div>

        <div className="w-12 h-px bg-border/40 mx-auto" />

        <p className="font-mono text-[10px] text-muted-foreground/40">{completionDate}</p>
      </div>

      {/* Download button — outside certRef, not captured in PDF */}
      <button
        onClick={handleDownload}
        className="w-full h-9 rounded-lg border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Download Certificate →
      </button>
    </div>
  );
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/src/components/dashboard/course-certificate.tsx app/package.json app/package-lock.json
git commit -m "feat: CourseCertificate — html2canvas+jspdf downloadable PDF"
```

---

## Task 12: Update course overview page — 4-state machine + wire new components

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

**Context:** Replace two `getCourseFormResponse` boolean checks with a single `getCourseConfidenceResponses` call. Update the conditional block to 4 states: onboarding form → progress CTA → completion form → report card + certificate. Pass `studentName` and `completionDate` to `CourseCertificate`.

**Step 1: Update imports**

Add to the import from `@/lib/data`:
```ts
getCourseConfidenceResponses,
type ConfidenceForm,
```

Remove from the import: `getCourseFormResponse` (if present).

Add new component imports:
```ts
import { ReportCard } from '@/components/dashboard/report-card';
import { CourseCertificate } from '@/components/dashboard/course-certificate';
```

**Step 2: Replace the parallel data fetch**

Find:
```ts
const [completionStatus, lessonsByModule, onboardingSubmitted, completionSubmitted] = await Promise.all([
  user?.id
    ? getSectionCompletionStatus(user.id, course.modules)
    : Promise.resolve({} as Record<string, SectionStatus>),
  getLessonsForCourse(moduleIds),
  user?.id && course.onboarding_form
    ? getCourseFormResponse(user.id, course.id, 'onboarding')
    : Promise.resolve(true),
  user?.id && course.completion_form
    ? getCourseFormResponse(user.id, course.id, 'completion')
    : Promise.resolve(true),
]);
```

Replace with:
```ts
const [completionStatus, lessonsByModule, confidenceResponses] = await Promise.all([
  user?.id
    ? getSectionCompletionStatus(user.id, course.modules)
    : Promise.resolve({} as Record<string, SectionStatus>),
  getLessonsForCourse(moduleIds),
  user?.id
    ? getCourseConfidenceResponses(user.id, course.id)
    : Promise.resolve({ onboarding: null, completion: null }),
]);

const onboardingSubmitted = confidenceResponses.onboarding !== null;
const completionSubmitted = confidenceResponses.completion !== null;
```

**Step 3: Compute completionDate and studentName**

After the `isCompleted` computation, add:
```ts
const completionDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const studentName = user?.email ?? 'Student';
```

**Step 4: Update the progress/form conditional block**

Find the block starting with:
```tsx
{user && (
  <>
    {course.onboarding_form && !onboardingSubmitted && !hasStarted ? (
      <OnboardingFormWrapper courseId={course.id} form={course.onboarding_form} />
    ) : course.completion_form && !completionSubmitted && isCompleted ? (
      <CompletionFormWrapper courseId={course.id} form={course.completion_form} />
    ) : (
      <div>...progress bar + CTA...</div>
    )}
  </>
)}
```

Replace with:
```tsx
{user && course.confidence_form && (
  <>
    {!onboardingSubmitted && !hasStarted ? (
      <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
    ) : isCompleted && !completionSubmitted ? (
      <CompletionFormWrapper courseId={course.id} form={course.confidence_form} />
    ) : isCompleted && completionSubmitted ? (
      <div className="space-y-4">
        <ReportCard
          questions={(course.confidence_form as ConfidenceForm).questions}
          onboarding={confidenceResponses.onboarding!}
          completion={confidenceResponses.completion!}
        />
        <CourseCertificate
          studentName={studentName}
          courseTitle={course.title}
          completionDate={completionDate}
        />
      </div>
    ) : (
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {hasStarted ? 'In progress' : 'Not started'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedItems} / {totalItems} items completed
            </p>
          </div>
          <span className="font-mono text-lg font-semibold text-primary tabular-nums">
            {progressPct}%
          </span>
        </div>
        <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <Link
          href={resumeHref}
          className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {hasStarted ? 'Continue learning' : 'Start course'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    )}
  </>
)}
```

**Step 5: Remove dead code**

Remove the now-unused `course.outro_content` completed block if it references old form logic. Keep the outcomes + curriculum sections intact.

**Step 6: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add app/src/app/dashboard/course/[courseSlug]/page.tsx
git commit -m "feat: course overview — 4-state confidence form flow, report card, certificate"
```

---

## Task 13: Seed script — add confidence_form to all courses + update validator

**Files:**
- Modify: `app/scripts/seed-content.ts`
- Modify: `app/scripts/validate-content.mjs`

**Context:** Every course must have a `confidence_form`. Add it to the seed data and validate it exists in the validator.

**Step 1: Add `confidence_form` to the course INSERT in seed-content.ts**

Find the course INSERT (look for `INSERT INTO courses`) and add `confidence_form` to the column list and values. Example for the Python Fundamentals course:

```ts
confidence_form: {
  title: "Rate your Python confidence",
  questions: [
    { id: "q1", statement: "How confident are you writing Python functions?" },
    { id: "q2", statement: "How confident are you working with loops and conditionals?" },
    { id: "q3", statement: "How confident are you reading and debugging Python errors?" },
    { id: "q4", statement: "How confident are you using Python data structures (lists, dicts)?" },
  ],
},
```

Ensure the seed script passes `confidence_form` as a JSONB value in the INSERT/UPSERT for courses.

**Step 2: Update validate-content.mjs**

Add a check that every course has a non-null `confidence_form` with at least 1 question. In the validation loop over courses, add:

```js
if (!course.confidence_form) {
  violations.push(`Course "${course.title}" missing confidence_form`);
} else if (!Array.isArray(course.confidence_form.questions) || course.confidence_form.questions.length < 1) {
  violations.push(`Course "${course.title}" confidence_form has no questions`);
}
```

**Step 3: Run seed + validate**

```bash
npx tsx app/scripts/seed-content.ts
node app/scripts/validate-content.mjs
```

Expected: seed completes, validate exits 0 (clean).

**Step 4: Final type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/scripts/seed-content.ts app/scripts/validate-content.mjs
git commit -m "feat: seed confidence_form for all courses, validate enforcement"
```

---

## Verification Checklist

After all tasks complete, verify in the browser (`npm run dev`):

- [ ] Sidebar lesson dots all same size — no layout shift on navigation
- [ ] Completing a lesson → sidebar dots update without hard reload
- [ ] Completed + active lesson shows `CircleDot` in success colour
- [ ] Lesson header shows "completed" pill (not checkmark icon) when revisiting done lesson
- [ ] No "wrap up →" footer bar in lesson player
- [ ] Quiz pass → confetti fires, sidebar updates, module completion dual-burst fires on first pass
- [ ] Retaking quiz (DELETE) clears attempt, quiz is re-takeable
- [ ] Course overview: unanswered onboarding → Likert form shows (not MCQ)
- [ ] Submit onboarding → refreshes to progress + CTA
- [ ] Complete all lessons + quiz → completion form shows
- [ ] Submit completion → report card + certificate renders
- [ ] "Download Certificate →" button generates and downloads PDF
- [ ] `npx tsc --noEmit` → no errors
- [ ] `node app/scripts/validate-content.mjs` → exits 0
