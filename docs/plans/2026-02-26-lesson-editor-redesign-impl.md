# Lesson + Editor Pane Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Move problem panel out of the lesson pane and into the editor pane, and add course-level onboarding + completion forms backed by a new DB table.

**Architecture:** Task 1–2 are pure UI changes with no DB impact. Tasks 3–7 build the course forms feature end-to-end: migration → data layer → API → UI → page integration. Module intro/outro templates already exist in the correct shape — no changes needed there.

**Tech Stack:** Next.js 15 App Router, TypeScript, Neon PostgreSQL (raw SQL via `@neondatabase/serverless`), Tailwind CSS v4, React Server Components + client components. No test framework — verification via `npx tsc --noEmit` + `npm run lint`.

**Key files to understand before starting:**
- `app/src/components/lesson/lesson-sections.tsx` — prose pane content renderer
- `app/src/components/lesson/code-lesson-layout.tsx` — the lesson player shell (props wiring, pane layout)
- `app/src/components/lesson/problem-panel.tsx` — challenge statement UI
- `app/src/lib/data.ts` — all DB queries; `Course` interface; `getCourseWithModules`, `getCourses`, `getCoursesForSidebar`
- `app/src/app/dashboard/course/[courseSlug]/page.tsx` — course overview Server Component
- `app/migrations/` — migration SQL files (run manually in Neon console)

---

## Task 1: Lesson pane — theory only (remove problem panel)

**Goal:** Strip the problem panel out of `LessonSections`. The lesson pane now renders only `introContent → sections → outroContent`.

**Files:**
- Modify: `app/src/components/lesson/lesson-sections.tsx`
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Step 1: Rewrite `lesson-sections.tsx`**

Replace the entire file content with:

```tsx
'use client';

import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';

interface LessonSectionsProps {
  introContent: unknown | null;
  sections: DbLessonSection[];
  outroContent: unknown | null;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

export function LessonSections({
  introContent,
  sections,
  outroContent,
}: LessonSectionsProps) {
  const hasContent =
    introContent !== null || sections.length > 0 || outroContent !== null;

  if (!hasContent) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      {introContent !== null && (
        <div className="mb-12">
          <SectionDivider label="intro" />
          {renderTemplate('lesson-intro', introContent)}
        </div>
      )}

      {sections.map((section, i) => (
        <div key={section.id} className="mb-12">
          <SectionDivider label={String(i + 1).padStart(2, '0')} />
          {renderTemplate(section.template as TemplateName, section.content)}
        </div>
      ))}

      {outroContent !== null && (
        <div className="mb-12">
          <SectionDivider label="outro" />
          {renderTemplate('lesson-outro', outroContent)}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update `CodeLessonLayout` — stop passing problem props to `LessonSections`**

In `app/src/components/lesson/code-lesson-layout.tsx`, find the `<LessonSections` JSX block (around line 238–247) and replace it:

```tsx
// Before:
<LessonSections
  introContent={introContent}
  sections={sections}
  outroContent={outroContent}
  problemSummary={problemSummary}
  problemConstraints={problemConstraints}
  problemHints={problemHints}
  testCases={testCases}
  entryPoint={entryPoint}
/>

// After:
<LessonSections
  introContent={introContent}
  sections={sections}
  outroContent={outroContent}
/>
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors (the removed props were optional in effect; the interface change removes the unused props from both sides).

**Step 4: Commit**

```bash
git add app/src/components/lesson/lesson-sections.tsx app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: lesson pane theory-only — remove problem panel from LessonSections"
```

---

## Task 2: Editor pane — problem panel pinned above editor

**Goal:** Add `ProblemPanel` directly into the code pane in `CodeLessonLayout`, above the editor. It's hidden when `problemSummary` is null. Add collapsible sections for constraints and hints to `ProblemPanel`.

**Files:**
- Modify: `app/src/components/lesson/problem-panel.tsx`
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Step 1: Rewrite `problem-panel.tsx` with collapsible constraints + hints**

Replace the entire file with:

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
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: ProblemPanelProps) {
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);

  return (
    <div className="overflow-y-auto border-b border-border/50 dark:border-zinc-700/50 bg-background dark:bg-zinc-950" style={{ maxHeight: '40%' }}>
      <div className="px-4 py-3 space-y-3">

        {/* Summary */}
        <p className="text-sm text-foreground/80 leading-relaxed">
          {problemSummary}
        </p>

        {/* Examples */}
        {visibleExamples.length > 0 && entryPoint && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
              examples
            </span>
            <div className="space-y-1">
              {visibleExamples.map((tc, i) => (
                <div
                  key={i}
                  className="font-mono text-xs bg-muted/40 dark:bg-zinc-800/60 rounded px-2.5 py-1.5 flex items-center gap-2"
                >
                  <span className="text-foreground/70">
                    {entryPoint}({tc.args.map(a => JSON.stringify(a)).join(', ')})
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="text-emerald-400/90">{JSON.stringify(tc.expected)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints — collapsible */}
        {problemConstraints.length > 0 && (
          <div>
            <button
              onClick={() => setConstraintsOpen(o => !o)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                constraints
              </span>
              <ChevronIcon open={constraintsOpen} />
            </button>
            {constraintsOpen && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {problemConstraints.map((c, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs text-muted-foreground/70 bg-muted/40 dark:bg-zinc-800/60 rounded px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hints — collapsible, reveal one at a time */}
        {problemHints.length > 0 && (
          <div>
            <button
              onClick={() => setHintsOpen(o => !o)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                hints
              </span>
              <ChevronIcon open={hintsOpen} />
            </button>
            {hintsOpen && (
              <div className="mt-1.5 space-y-1.5">
                {problemHints.slice(0, hintsRevealed).map((hint, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-3 py-2 border border-border/30"
                  >
                    {hint}
                  </div>
                ))}
                {hintsRevealed < problemHints.length && (
                  <button
                    onClick={() => setHintsRevealed(h => h + 1)}
                    className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    show hint {hintsRevealed + 1}/{problemHints.length} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
```

**Step 2: Add `ProblemPanel` into the code pane in `CodeLessonLayout`**

In `code-lesson-layout.tsx`, find the `CodePane` constant (around line 252). The current structure is:

```tsx
const CodePane = (
  <div className="flex flex-col flex-1 overflow-hidden">
    <div className="shrink-0 h-9 ...">  {/* editor toolbar */}
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <CodeEditor ... />
      <OutputPanel ... />
    </div>
  </div>
);
```

Replace `CodePane` with this (add `ProblemPanel` above the toolbar, hidden when no `problemSummary`):

```tsx
const CodePane = (
  <div className="flex flex-col flex-1 overflow-hidden">
    {/* Problem panel — pinned above editor, hidden for theory-only lessons */}
    {problemSummary && (
      <ProblemPanel
        problemSummary={problemSummary}
        problemConstraints={problemConstraints}
        problemHints={problemHints}
        testCases={testCases}
        entryPoint={entryPoint}
      />
    )}
    {/* Editor toolbar */}
    <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 border-b border-border dark:border-zinc-700">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">editor</span>
      <div className="flex items-center gap-2">
        {saveStatus === 'saved' && (
          <span className="font-mono text-[10px] text-muted-foreground">saved</span>
        )}
        <button
          onClick={() => solutionCode && handleCodeChange(solutionCode)}
          className="px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted dark:hover:bg-zinc-700 transition-colors"
        >
          solution
        </button>
        <button
          onClick={handleRun}
          disabled={executionPhase === 'running'}
          className="flex items-center gap-1 px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {executionPhase === 'running' ? 'running···' : 'run'}
        </button>
      </div>
    </div>
    {/* Editor + output */}
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <CodeEditor value={code} onChange={handleCodeChange} />
      <OutputPanel
        phase={executionPhase}
        output={output}
        error={parsedError}
        hasTestCases={!!(testCases && testCases.length > 0)}
        hasRun={hasRun}
        testResults={testResults}
        metrics={metrics}
      />
    </div>
  </div>
);
```

Also add the `ProblemPanel` import at the top of `code-lesson-layout.tsx` (if not already present):
```tsx
import { ProblemPanel } from '@/components/lesson/problem-panel';
```

**Step 3: Type-check and lint**

```bash
cd app && npx tsc --noEmit && npm run lint
```

Expected: no errors.

**Step 4: Manual verification**

Navigate to a lesson with a code challenge (e.g. `/dashboard/course/intro-to-python/hello-world/lesson/1`). Confirm:
- Lesson pane: only theory content (intro, sections, outro) — no challenge block
- Code pane: problem summary appears above the editor; constraints and hints are collapsible
- Theory-only lesson (no `problemSummary`): problem panel is absent, editor fills the space

**Step 5: Commit**

```bash
git add app/src/components/lesson/problem-panel.tsx app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: problem panel pinned above editor in code pane, collapsible constraints+hints"
```

---

## Task 3: DB migration — course forms schema

**Goal:** Add `onboarding_form` and `completion_form` JSONB columns to `courses`, and create the `user_course_form_responses` table.

**Files:**
- Create: `app/migrations/2026-02-26-course-forms.sql`

**Step 1: Write the migration**

Create `app/migrations/2026-02-26-course-forms.sql`:

```sql
-- Migration: Course-level onboarding + completion forms
-- Date: 2026-02-26
-- Safe: additive only. No destructive changes.

BEGIN;

-- 1. Add form columns to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS onboarding_form JSONB,
  ADD COLUMN IF NOT EXISTS completion_form JSONB;

ALTER TABLE courses
  ADD CONSTRAINT IF NOT EXISTS courses_onboarding_is_object
    CHECK (onboarding_form IS NULL OR jsonb_typeof(onboarding_form) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS courses_completion_is_object
    CHECK (completion_form IS NULL OR jsonb_typeof(completion_form) = 'object');

-- 2. Responses table
CREATE TABLE IF NOT EXISTS user_course_form_responses (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id      TEXT NOT NULL,
  course_id    TEXT NOT NULL,
  form_type    TEXT NOT NULL,
  responses    JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id, form_type),
  CHECK (form_type IN ('onboarding', 'completion')),
  CHECK (jsonb_typeof(responses) = 'object')
);

CREATE INDEX IF NOT EXISTS user_course_form_responses_user_course
  ON user_course_form_responses (user_id, course_id);

COMMIT;
```

**Step 2: Run the migration in Neon console**

Open the Neon console (or use the `psql` CLI with `DATABASE_URL`), paste the SQL above, and execute it. Verify no errors.

**Step 3: Commit**

```bash
git add app/migrations/2026-02-26-course-forms.sql
git commit -m "feat: add course onboarding/completion form columns + user_course_form_responses table"
```

---

## Task 4: Data layer — course type + queries

**Goal:** Add `onboarding_form` and `completion_form` to the `Course` TypeScript interface and to all queries that SELECT from `courses`. Add helper functions `getCourseFormResponse` and `submitCourseFormResponse`.

**Files:**
- Modify: `app/src/lib/data.ts`

**Step 1: Add a `CourseForm` type and extend the `Course` interface**

Find the `Course` interface (around line 15). Add a new `CourseForm` interface above it, and add two new fields to `Course`:

```ts
// Add this new interface above Course:
export interface CourseForm {
  title: string;
  questions: {
    id: string;
    statement: string;
    options: { id: string; text: string }[];
  }[];
}

// In the Course interface, add after outro_content:
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  outcomes: string[] | null;
  tag: string | null;
  order: number;
  intro_content: unknown | null;
  outro_content: unknown | null;
  onboarding_form: CourseForm | null;  // NEW
  completion_form: CourseForm | null;  // NEW
}
```

**Step 2: Update `getCourses` to select the new columns**

Find `getCourses()` (around line 127). Update the SELECT:

```ts
// Before:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, created_at

// After:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, onboarding_form, completion_form, created_at
```

**Step 3: Update `getCourseWithModules` to select the new columns**

Find `getCourseWithModules` (around line 146). Update the courses SELECT:

```ts
// Before:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, created_at

// After:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, onboarding_form, completion_form, created_at
```

**Step 4: Update `getCoursesForSidebar` to select the new columns**

Find `getCoursesForSidebar` (around line 875). Update the courses SELECT:

```ts
// Before:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, created_at

// After:
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       intro_content, outro_content, onboarding_form, completion_form, created_at
```

**Step 5: Add `getCourseFormResponse` and `submitCourseFormResponse` helper functions**

Add these two functions at the end of the data layer section (before the closing of the file or near `getSectionCompletionStatus`):

```ts
/**
 * Check whether a user has submitted a course form.
 */
export async function getCourseFormResponse(
  userId: string,
  courseId: string,
  formType: 'onboarding' | 'completion'
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_course_form_responses
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND form_type = ${formType}
    `;
    return result.length > 0;
  } catch (error) {
    console.error('getCourseFormResponse error:', error);
    return false;
  }
}

/**
 * Persist a course form submission (idempotent via ON CONFLICT DO NOTHING).
 */
export async function submitCourseFormResponse(
  userId: string,
  courseId: string,
  formType: 'onboarding' | 'completion',
  responses: Record<string, string>
): Promise<void> {
  await sql`
    INSERT INTO user_course_form_responses (user_id, course_id, form_type, responses)
    VALUES (${userId}, ${courseId}, ${formType}, ${JSON.stringify(responses)}::JSONB)
    ON CONFLICT (user_id, course_id, form_type) DO NOTHING
  `;
}
```

**Step 6: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: add CourseForm type, onboarding/completion_form to Course, form response helpers"
```

---

## Task 5: API route — course form responses

**Goal:** Create `POST /api/course/form-response` to submit a form response, and `GET /api/course/form-response` to check submission status.

**Files:**
- Create: `app/src/app/api/course/form-response/route.ts`

**Step 1: Create the API route**

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getCourseFormResponse, submitCourseFormResponse } from '@/lib/data';

export async function GET(req: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const formType = searchParams.get('formType') as 'onboarding' | 'completion' | null;

    if (!courseId || !formType || !['onboarding', 'completion'].includes(formType)) {
      return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
    }

    const submitted = await getCourseFormResponse(user.id, courseId, formType);
    return NextResponse.json({ submitted });
  } catch (error) {
    console.error('GET course form-response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await auth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, formType, responses } = await req.json();

    if (
      !courseId ||
      !formType ||
      !['onboarding', 'completion'].includes(formType) ||
      typeof responses !== 'object' ||
      responses === null
    ) {
      return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
    }

    await submitCourseFormResponse(user.id, courseId, formType, responses);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST course form-response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/app/api/course/form-response/route.ts
git commit -m "feat: add GET/POST /api/course/form-response API route"
```

---

## Task 6: Course form UI component

**Goal:** A reusable client-side MCQ form component that can render both onboarding and completion forms, submits via the API route, and calls `onComplete` when done.

**Files:**
- Create: `app/src/components/dashboard/course-form.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import type { CourseForm } from '@/lib/data';

interface CourseFormPlayerProps {
  courseId: string;
  formType: 'onboarding' | 'completion';
  form: CourseForm;
  onComplete: () => void;
}

export function CourseFormPlayer({
  courseId,
  formType,
  form,
  onComplete,
}: CourseFormPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const question = form.questions[currentQuestion];
  const totalQuestions = form.questions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) setCurrentQuestion(q => q + 1);
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(q => q - 1);
  };

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
      // fail silently — still call onComplete so UX doesn't block
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          {formType === 'onboarding' ? 'Before you begin' : 'Course complete'}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{form.title}</h2>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums shrink-0">
          {currentQuestion + 1}/{totalQuestions}
        </span>
      </div>

      {/* Question */}
      <div>
        <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
          {question.statement}
        </p>
        <div className="space-y-2">
          {question.options.map(option => {
            const isSelected = answers[question.id] === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border/50 hover:border-primary/40 hover:bg-muted/30 text-foreground/80'
                }`}
              >
                <span className={`font-mono text-xs mr-3 ${isSelected ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  {option.id.toUpperCase()}
                </span>
                {option.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="px-3 h-8 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← prev
        </button>

        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={handleNext}
            disabled={!answers[question.id]}
            className="px-3 h-8 rounded bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="px-4 h-8 rounded bg-primary text-primary-foreground text-xs font-mono hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving···' : 'Submit →'}
          </button>
        )}
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
git add app/src/components/dashboard/course-form.tsx
git commit -m "feat: CourseFormPlayer client component for onboarding/completion MCQ forms"
```

---

## Task 7: Course overview page — form integration

**Goal:** On the course overview page, show the onboarding form (if exists + not yet submitted) in place of the "Start Course" CTA; show the completion form (if exists + not yet submitted) when the course is complete.

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

**Step 1: Fetch form submission status in the Server Component**

In `CourseOverviewPage`, after computing `isCompleted` and `hasStarted`, add parallel fetches for form submission status:

```ts
// After computing isCompleted and hasStarted, add:
const [onboardingSubmitted, completionSubmitted] = user?.id
  ? await Promise.all([
      course.onboarding_form
        ? import('@/lib/data').then(m => m.getCourseFormResponse(user.id, course.id, 'onboarding'))
        : Promise.resolve(true),   // treat as "submitted" (no form = skip)
      course.completion_form
        ? import('@/lib/data').then(m => m.getCourseFormResponse(user.id, course.id, 'completion'))
        : Promise.resolve(true),
    ])
  : [true, true];
```

Actually, use a cleaner direct import at the top of the file. Add `getCourseFormResponse` to the existing import from `@/lib/data`:

```ts
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseFormResponse,   // ADD THIS
} from '@/lib/data';
```

Then fetch in parallel alongside existing fetches:

```ts
const [completionStatus, lessonsByModule, onboardingSubmitted, completionSubmitted] = await Promise.all([
  user?.id
    ? getSectionCompletionStatus(user.id, course.modules)
    : Promise.resolve({} as Record<string, boolean>),
  getLessonsForCourse(moduleIds),
  user?.id && course.onboarding_form
    ? getCourseFormResponse(user.id, course.id, 'onboarding')
    : Promise.resolve(true),
  user?.id && course.completion_form
    ? getCourseFormResponse(user.id, course.id, 'completion')
    : Promise.resolve(true),
]);
```

**Step 2: Pass form data to the Progress + CTA section**

The form logic is:
- Show onboarding form: `user && course.onboarding_form && !onboardingSubmitted && !hasStarted`
- Show completion form: `user && course.completion_form && !completionSubmitted && isCompleted`

Replace the `{/* ─── Progress + CTA ─────────────────────────────────────── */}` block with:

```tsx
{/* ─── Progress + CTA / Onboarding form / Completion form ── */}
{user && (
  <>
    {/* Onboarding form — shown before starting if not yet submitted */}
    {course.onboarding_form && !onboardingSubmitted && !hasStarted ? (
      <OnboardingFormWrapper
        courseId={course.id}
        form={course.onboarding_form}
      />
    ) : course.completion_form && !completionSubmitted && isCompleted ? (
      /* Completion form — shown when course is complete + form not submitted */
      <CompletionFormWrapper
        courseId={course.id}
        form={course.completion_form}
      />
    ) : (
      /* Normal progress + CTA */
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isCompleted ? 'Course complete' : hasStarted ? 'In progress' : 'Not started'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedItems} / {totalItems} items completed
            </p>
          </div>
          <span className="font-mono text-lg font-semibold text-primary tabular-nums">
            {progressPct}%
          </span>
        </div>
        {/* Progress bar */}
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
          {isCompleted ? 'Review course' : hasStarted ? 'Continue learning' : 'Start course'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    )}
  </>
)}
```

**Step 3: Add wrapper client components at the bottom of the file**

These thin wrappers turn the Server Component page into a client interaction via `useRouter().refresh()` to re-render after form submission:

```tsx
'use client';
// Note: add these BELOW the default export, they are separate named exports in the same file.
// They need 'use client' but the page is a Server Component.
// Solution: extract them to a separate file.
```

Actually, since the page is a Server Component, we need separate client component files or use the existing `CourseFormPlayer` through a wrapper. The cleanest approach:

Create `app/src/components/dashboard/course-form-wrappers.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseFormPlayer } from './course-form';
import type { CourseForm } from '@/lib/data';

export function OnboardingFormWrapper({
  courseId,
  form,
}: {
  courseId: string;
  form: CourseForm;
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
    <CourseFormPlayer
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
  form: CourseForm;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
        <p className="text-sm font-medium text-foreground mb-1">🎉 Course complete!</p>
        <p className="text-xs text-muted-foreground">Thanks for your feedback.</p>
      </div>
    );
  }

  return (
    <CourseFormPlayer
      courseId={courseId}
      formType="completion"
      form={form}
      onComplete={() => setDone(true)}
    />
  );
}
```

**Step 4: Update the course overview page to import wrappers**

Add import at top of `page.tsx`:
```ts
import { OnboardingFormWrapper, CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';
```

**Step 5: Type-check and lint**

```bash
cd app && npx tsc --noEmit && npm run lint
```

Expected: no errors.

**Step 6: Manual verification**

For a course without forms: page should look identical to before.

To test forms: temporarily add a `onboarding_form` JSONB value to a course row in Neon console:

```sql
UPDATE courses
SET onboarding_form = '{
  "title": "Quick check-in",
  "questions": [
    {
      "id": "q1",
      "statement": "How would you describe your Python experience?",
      "options": [
        {"id": "a", "text": "Complete beginner"},
        {"id": "b", "text": "Wrote a few scripts"},
        {"id": "c", "text": "Built projects"},
        {"id": "d", "text": "Professional developer"}
      ]
    }
  ]
}'::JSONB
WHERE slug = 'intro-to-python';
```

Navigate to the course overview page. Confirm the form appears, selecting options works, submitting calls the API and shows the "Start course →" button.

**Step 7: Commit**

```bash
git add app/src/components/dashboard/course-form-wrappers.tsx app/src/app/dashboard/course/[courseSlug]/page.tsx
git commit -m "feat: show onboarding/completion forms on course overview page"
```

---

## Final verification

```bash
cd app && npx tsc --noEmit && npm run lint
```

Then do a full local smoke-test:
1. Lesson with code challenge: problem panel above editor, theory in lesson pane
2. Theory-only lesson: no problem panel, editor fills code pane
3. Course with no forms: overview page unchanged
4. Course with onboarding form (added via SQL): form shown before Start Course
5. Course with completion form: form shown when course is complete
