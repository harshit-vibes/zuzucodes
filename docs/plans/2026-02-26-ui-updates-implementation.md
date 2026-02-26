# UI Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the template system into a cohesive warm/course-like UI across lesson templates, a new module overview page, and the enhanced course landing page.

**Architecture:** Component-first — data layer updated first so types are correct, template components redesigned next as the visual foundation, then module/course pages built on top. No new dependencies needed; all components use existing Tailwind + Lucide.

**Tech Stack:** Next.js App Router (server + client components), Tailwind CSS v4, Lucide React, `@neondatabase/serverless` raw SQL, Zod template schemas.

**Design spec:** `docs/plans/2026-02-26-ui-updates-design.md`

---

## Task 1: Add intro_content / outro_content to data types and queries

**Files:**
- Modify: `app/src/lib/data.ts`

**Context:**
The `modules` and `courses` tables both have `intro_content JSONB` and `outro_content JSONB` columns (added in the 2026-02-26 migration) but the TypeScript types and SQL queries don't fetch them yet. The module overview page and course page hero both need these fields.

**Step 1: Update Course and Module types**

In `app/src/lib/data.ts`, add the two fields to both interfaces:

```typescript
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  outcomes: string[] | null;
  tag: string | null;
  order: number;
  intro_content: unknown | null;   // add this
  outro_content: unknown | null;   // add this
}
```

```typescript
export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order: number;
  quiz_form: QuizForm | null;
  lesson_count: number;
  intro_content: unknown | null;   // add this
  outro_content: unknown | null;   // add this
}
```

**Step 2: Update getCourseWithModules() query**

Find the courses SELECT inside `getCourseWithModules()` (around line 115):

```typescript
// BEFORE:
const courses = await sql`
  SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order", created_at
  FROM courses
  WHERE id = ${courseId}
`;

// AFTER:
const courses = await sql`
  SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
         intro_content, outro_content, created_at
  FROM courses
  WHERE id = ${courseId}
`;
```

**Step 3: Update getModule() query**

Find the SELECT inside `getModule()` (around line 145):

```typescript
// BEFORE:
const result = await sql`
  SELECT m.id, m.course_id, m.title, m.description, m."order",
         m.quiz_form, COALESCE(lc.lesson_count, 0) AS lesson_count
  FROM modules m
  LEFT JOIN (
    SELECT module_id, COUNT(*)::INTEGER AS lesson_count
    FROM lessons GROUP BY module_id
  ) lc ON lc.module_id = m.id
  WHERE m.id = ${moduleId}
`;

// AFTER:
const result = await sql`
  SELECT m.id, m.course_id, m.title, m.description, m."order",
         m.quiz_form, m.intro_content, m.outro_content,
         COALESCE(lc.lesson_count, 0) AS lesson_count
  FROM modules m
  LEFT JOIN (
    SELECT module_id, COUNT(*)::INTEGER AS lesson_count
    FROM lessons GROUP BY module_id
  ) lc ON lc.module_id = m.id
  WHERE m.id = ${moduleId}
`;
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: add intro_content/outro_content to Course and Module types and queries"
```

---

## Task 2: Redesign lesson-intro and lesson-outro template components

**Files:**
- Modify: `app/src/components/templates/lesson-intro.tsx`
- Modify: `app/src/components/templates/lesson-outro.tsx`

**Context:**
Current components use tiny dots as bullets and plain italic text. New design: check icons from Lucide, left accent line on hook, pill badge for time estimate. lesson-outro gets a "Lesson complete" label and a forward card for "Up next".

**Step 1: Rewrite lesson-intro.tsx**

Replace the entire file with:

```tsx
'use client';

import { CheckCircle2, Clock } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-intro'>;
}

export function LessonIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-l-2 border-primary/40 pl-4">
        <p className="text-lg leading-relaxed text-foreground/85">{content.hook}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll learn
        </p>
        <ul className="flex flex-col gap-2.5">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.estimated_minutes && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40 font-mono">
            ~{content.estimated_minutes} min
          </span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Rewrite lesson-outro.tsx**

Replace the entire file with:

```tsx
'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-outro'>;
}

export function LessonOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-xs font-mono uppercase tracking-widest text-green-500/70">
          Lesson complete
        </span>
      </div>

      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
        </div>
      )}
    </div>
  );
}
```

**Step 3: Type-check and verify**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

Visual check: navigate to a lesson with intro/outro content in the browser. The intro should show a left-accented hook, check icons for outcomes, and a clock badge. The outro should show a green check + "Lesson complete" label.

**Step 4: Commit**

```bash
git add app/src/components/templates/lesson-intro.tsx \
        app/src/components/templates/lesson-outro.tsx
git commit -m "feat: redesign lesson-intro and lesson-outro templates (warm/course-like)"
```

---

## Task 3: Redesign code-section template component

**Files:**
- Modify: `app/src/components/templates/code-section.tsx`

**Context:**
The takeaway is currently plain italic text. New design: highlighted callout box with `bg-primary/5` tint, a "Key takeaway" label, and bordered container. Explanation and code block rendering via `<Markdown>` stays identical.

**Step 1: Rewrite code-section.tsx**

Replace the entire file with:

```tsx
'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'code-section'>;
}

export function CodeSectionTemplate({ content }: Props) {
  const fenced = `\`\`\`${content.language}\n${content.code}\n\`\`\``;

  return (
    <div className="flex flex-col gap-4">
      <div className="prose-container">
        <Markdown content={content.explanation} />
      </div>

      <div className="prose-container">
        <Markdown content={fenced} />
      </div>

      {content.takeaway && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-foreground/70">{content.takeaway}</p>
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

**Step 3: Commit**

```bash
git add app/src/components/templates/code-section.tsx
git commit -m "feat: redesign code-section template (takeaway callout box)"
```

---

## Task 4: Redesign module-intro and module-outro template components

**Files:**
- Modify: `app/src/components/templates/module-intro.tsx`
- Modify: `app/src/components/templates/module-outro.tsx`

**Context:**
These will be rendered on the new module overview page. `module-intro` gets a 2-column checklist grid with check icons. `module-outro` gets a forward card mirroring `lesson-outro`'s "Up next" treatment.

**Step 1: Rewrite module-intro.tsx**

```tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-intro'>;
}

export function ModuleIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{content.title}</h2>
        <p className="mt-2 text-foreground/70 leading-relaxed">{content.description}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          In this module
        </p>
        <ul className={`grid gap-2.5 ${content.what_you_learn.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
          {content.what_you_learn.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

**Step 2: Rewrite module-outro.tsx**

```tsx
'use client';

import { ArrowRight } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-outro'>;
}

export function ModuleOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_module && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
              Coming up
            </p>
            <p className="text-sm text-foreground/70">{content.next_module}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
        </div>
      )}
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
git add app/src/components/templates/module-intro.tsx \
        app/src/components/templates/module-outro.tsx
git commit -m "feat: redesign module-intro and module-outro templates"
```

---

## Task 5: Redesign course-intro and course-outro template components

**Files:**
- Modify: `app/src/components/templates/course-intro.tsx`
- Modify: `app/src/components/templates/course-outro.tsx`

**Context:**
`course-intro` will be rendered in the course page hero. It gets a large hook text, 2-column outcomes grid, and a muted "who is this for" line. `course-outro` gets a distinct certificate card with primary tint.

**Step 1: Rewrite course-intro.tsx**

```tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-intro'>;
}

export function CourseIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xl leading-relaxed text-foreground/85">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll achieve
        </p>
        <ul className={`grid gap-2.5 ${content.outcomes.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.who_is_this_for && (
        <p className="text-sm text-muted-foreground/60 italic">{content.who_is_this_for}</p>
      )}
    </div>
  );
}
```

**Step 2: Rewrite course-outro.tsx**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-outro'>;
}

export function CourseOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.certificate_info && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-2">
            Certificate
          </p>
          <p className="text-sm text-foreground/70">{content.certificate_info}</p>
        </div>
      )}
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
git add app/src/components/templates/course-intro.tsx \
        app/src/components/templates/course-outro.tsx
git commit -m "feat: redesign course-intro and course-outro templates"
```

---

## Task 6: Create the module overview page

**Files:**
- Create: `app/src/app/dashboard/course/[courseId]/[moduleId]/page.tsx`

**Context:**
New route. Single page that adapts based on user progress: not started (show intro content), in progress (straight to list), completed (show outro content). Requires `getModule()` to now return `intro_content`/`outro_content` (done in Task 1). Data fetching: `getModule`, `getLessonsForCourse`, `getSectionCompletionStatus`. The module page is a server component — it imports `renderTemplate` from `@/components/templates` (a client component, which is fine in Next.js App Router).

**Step 1: Create the file**

Create `app/src/app/dashboard/course/[courseId]/[moduleId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
} from '@/lib/data';
import { renderTemplate } from '@/components/templates';

export default async function ModuleOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const { courseId, moduleId } = await params;
  const { user } = await auth();

  const [course, mod] = await Promise.all([
    getCourseWithModules(courseId),
    getModule(moduleId),
  ]);

  if (!course || !mod) notFound();

  const lessons = (await getLessonsForCourse([moduleId]))[moduleId] ?? [];

  const completionStatus = user?.id
    ? await getSectionCompletionStatus(user.id, [mod])
    : ({} as Record<string, boolean>);

  const lessonsDone = lessons.filter(
    (l) => completionStatus[`${moduleId}:lesson-${l.lesson_index}`]
  ).length;
  const quizDone = mod.quiz_form
    ? (completionStatus[`${moduleId}:quiz`] ?? false)
    : false;
  const totalItems = lessons.length + (mod.quiz_form ? 1 : 0);
  const completedItems = lessonsDone + (quizDone ? 1 : 0);

  const isNotStarted = completedItems === 0;
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  // First incomplete lesson or quiz
  let resumeHref = `/dashboard/course/${courseId}/${moduleId}/lesson/1`;
  for (const l of lessons) {
    if (!completionStatus[`${moduleId}:lesson-${l.lesson_index}`]) {
      resumeHref = `/dashboard/course/${courseId}/${moduleId}/lesson/${l.lesson_index + 1}`;
      break;
    }
  }
  if (completedItems === lessons.length && mod.quiz_form && !quizDone) {
    resumeHref = `/dashboard/course/${courseId}/${moduleId}/quiz`;
  }

  // Next module
  const modIndex = course.modules.findIndex((m) => m.id === moduleId);
  const nextMod = course.modules[modIndex + 1];
  const completedHref = nextMod
    ? `/dashboard/course/${courseId}/${nextMod.id}`
    : `/dashboard/course/${courseId}`;

  const ctaLabel = isCompleted
    ? nextMod
      ? 'Next Module'
      : 'Back to Course'
    : isNotStarted
    ? 'Start Module'
    : 'Continue';
  const ctaHref = isCompleted ? completedHref : resumeHref;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Link
            href={`/dashboard/course/${courseId}`}
            className="hover:text-muted-foreground transition-colors"
          >
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-foreground/70">{mod.title}</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Module {String(modIndex + 1).padStart(2, '0')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mod.title}
          </h1>
          {mod.description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {mod.description}
            </p>
          )}
        </div>

        {/* Intro content (not started) */}
        {isNotStarted && mod.intro_content && (
          <div className="rounded-xl border border-border/50 bg-card p-6">
            {renderTemplate('module-intro', mod.intro_content)}
          </div>
        )}

        {/* Outro content (completed) */}
        {isCompleted && mod.outro_content && (
          <div className="rounded-xl border border-border/50 bg-card p-6">
            {renderTemplate('module-outro', mod.outro_content)}
          </div>
        )}

        {/* CTA */}
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {ctaLabel}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        {/* Lesson list */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} &middot; {completedItems} completed
          </h2>
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/20">
            {lessons.map((lesson, i) => {
              const done =
                completionStatus[`${moduleId}:lesson-${lesson.lesson_index}`] ?? false;
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/course/${courseId}/${moduleId}/lesson/${lesson.lesson_index + 1}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  {done ? (
                    <svg
                      className="w-4 h-4 text-green-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border/60 shrink-0" />
                  )}
                  <span
                    className={`text-sm flex-1 ${
                      done ? 'text-muted-foreground/60' : 'text-foreground'
                    }`}
                  >
                    {i + 1}. {lesson.title}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              );
            })}

            {mod.quiz_form && (
              <Link
                href={`/dashboard/course/${courseId}/${moduleId}/quiz`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
              >
                {quizDone ? (
                  <svg
                    className="w-4 h-4 text-green-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-muted-foreground/40 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm flex-1 ${
                    quizDone ? 'text-muted-foreground/60' : 'text-foreground'
                  }`}
                >
                  Quiz — {mod.quiz_form.title}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </div>
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

Expected: no errors.

**Step 3: Visual check**

Start dev server (`npm run dev`) and navigate to `/dashboard/course/course-intro-python-001/module-intro-python-hello-world-001`.

Expected:
- Breadcrumb: "Introduction to Python / Hello, World!"
- Module header: "Module 01 — Hello, World!"
- No intro/outro content block (module has no `intro_content` seeded yet — fallback is graceful, block simply doesn't render)
- CTA: "Start Module" → lesson 1
- Lesson list with 3 lessons + quiz

**Step 4: Commit**

```bash
git add app/src/app/dashboard/course/\[courseId\]/\[moduleId\]/page.tsx
git commit -m "feat: add module overview page with progress-aware intro/outro content"
```

---

## Task 7: Update course page — hero uses course-intro template, module headers link to module page

**Files:**
- Modify: `app/src/app/dashboard/course/[courseId]/page.tsx`

**Context:**
Two targeted changes:
1. If `course.intro_content` exists, render it using `CourseIntroTemplate` instead of the plain description paragraph.
2. Module header rows in the curriculum section become `<Link>` elements pointing to the module overview page.

**Step 1: Add the renderTemplate import**

At the top of the file, add after the existing imports:

```typescript
import { renderTemplate } from '@/components/templates';
```

**Step 2: Replace the header description block**

Find the header section (around line 55–70). Replace the `{course.description && ...}` paragraph:

```tsx
// BEFORE:
{course.description && (
  <p className="text-sm text-muted-foreground leading-relaxed">
    {course.description}
  </p>
)}

// AFTER:
{course.intro_content
  ? renderTemplate('course-intro', course.intro_content)
  : course.description && (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {course.description}
      </p>
    )}
```

**Step 3: Make module header a Link**

Find the module header `<div>` inside the curriculum loop (around line 130). Replace the static `<div>` with a `<Link>`:

```tsx
// BEFORE:
<div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
  <div className="flex items-center gap-2.5 min-w-0">
    <ModuleStatusIcon status={modStatus} />
    <span className="text-sm font-medium text-foreground truncate">
      <span className="text-muted-foreground/50 mr-2 font-mono text-[11px]">
        {String(modIdx + 1).padStart(2, '0')}
      </span>
      {mod.title}
    </span>
  </div>
  <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0 ml-3">
    {modDone}/{modTotal}
  </span>
</div>

// AFTER:
<Link
  href={`/dashboard/course/${courseId}/${mod.id}`}
  className="flex items-center justify-between px-4 py-3 border-b border-border/30 hover:bg-muted/30 transition-colors group"
>
  <div className="flex items-center gap-2.5 min-w-0">
    <ModuleStatusIcon status={modStatus} />
    <span className="text-sm font-medium text-foreground truncate">
      <span className="text-muted-foreground/50 mr-2 font-mono text-[11px]">
        {String(modIdx + 1).padStart(2, '0')}
      </span>
      {mod.title}
    </span>
  </div>
  <div className="flex items-center gap-2 shrink-0 ml-3">
    <span className="text-[11px] font-mono text-muted-foreground/60">
      {modDone}/{modTotal}
    </span>
    <svg
      className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </div>
</Link>
```

**Step 4: Type-check and build**

```bash
cd app && npx tsc --noEmit && npm run build
```

Expected: no errors, build succeeds.

**Step 5: Visual check**

Navigate to `/dashboard/course/course-intro-python-001`.

Expected:
- Header: course description still shows as plain text (no `intro_content` seeded on the course yet — fallback works correctly)
- Module header "Hello, World!" is now clickable and navigates to the module overview page on hover/click
- Hover reveals a chevron on the right of the module header

**Step 6: Commit**

```bash
git add app/src/app/dashboard/course/\[courseId\]/page.tsx
git commit -m "feat: course page uses course-intro template in hero; module headers link to module page"
```

---

## Final Verification

```bash
cd app && npm run lint && npm run build
```

Expected: lint clean, build succeeds with all routes.

Navigate through the full flow:
1. `/dashboard/course/course-intro-python-001` — course page
2. Click module header → `/dashboard/course/.../module-intro-python-hello-world-001` — module page
3. Click "Start Module" → lesson 1
4. Navigate to lesson intro/outro sections — check icons, callout boxes, forward cards
