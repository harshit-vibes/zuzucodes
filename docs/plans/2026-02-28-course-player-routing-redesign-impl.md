# Course Player Routing Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current client-side intro/outro view state in `CodeLessonLayout` with explicit URL routes, add a `CoursePlayerShell` component that gives every course player page a standardised header + footer, and create three new pages (lesson intro, lesson outro, module outro).

**Architecture:** `buildCourseSequence()` computes the full linear step array from course data; each page finds itself by URL and reads `steps[i-1]` / `steps[i+1]` for prev/next. `CoursePlayerShell` is a server component that renders a fixed header (eyebrow + title + ThemeToggle + UserButton) and a fixed footer (Prev / Next with lock state) around scrollable children. The lesson content page passes `scrollable={false}` so `CodeLessonLayout` manages its own overflow.

**Tech Stack:** Next.js App Router (server components), Tailwind CSS v4, React.cache() on all data fetches (no extra DB round trips for sequence building)

**Important context:**
- `lessons.intro_content`, `lessons.outro_content`, `modules.outro_content` already exist in DB — **no migration needed**
- `LessonOverlay` currently handles the intro/outro UI inside the code editor — this component will be deleted
- `CodeLessonLayout` currently manages `view: 'intro' | 'content' | 'outro'` as client state — this state machine gets removed
- `DashboardHeader` returns null for `/lesson/` pages; `DashboardMain` uses overflow-hidden for lesson pages — both need updating to handle all `/dashboard/course/` pages
- Lesson data shape: `lessonData.introContent`, `lessonData.outroContent`, `lessonData.content`, `lessonData.problemSummary`, `lessonData.problemConstraints`, `lessonData.problemHints`
- The app is in `app/` subdirectory; run all commands from `app/`

---

### Task 1: Update `DashboardHeader` and `DashboardMain` for course player pages

**Files:**
- Modify: `app/src/components/dashboard/header.tsx`
- Modify: `app/src/components/dashboard/main.tsx`

**Context:** Currently both components check `pathname.includes('/lesson/')` to detect lesson pages. With the new routing, all `/dashboard/course/` pages use `CoursePlayerShell` for their own header, so `DashboardHeader` should be hidden and `DashboardMain` should use overflow-hidden for all course pages.

**Step 1: Update `header.tsx`**

Replace the file content:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';

export function DashboardHeader() {
  const pathname = usePathname();

  // Course player pages have their own shell header
  if (pathname.includes('/dashboard/course/')) return null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/50 px-4">
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
```

**Step 2: Update `main.tsx`**

Replace the file content:

```tsx
'use client';

import { usePathname } from 'next/navigation';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCoursePlayer = pathname.includes('/dashboard/course/');

  return (
    <div
      className={
        isCoursePlayer
          ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
          : 'flex-1 overflow-auto'
      }
    >
      {children}
    </div>
  );
}
```

**Step 3: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no new errors.

**Step 4: Commit**

```bash
git add app/src/components/dashboard/header.tsx app/src/components/dashboard/main.tsx
git commit -m "feat: hide DashboardHeader/Main for all course player pages"
```

---

### Task 2: Create `buildCourseSequence` utility

**Files:**
- Create: `app/src/lib/course-sequence.ts`

**Context:** This function builds the ordered array of every step in the course (welcome → mod intro → lesson intro → lesson content → lesson outro → quiz → mod outro → … → graduation → certificate). Every page calls this to find its prev/next step.

**Step 1: Create the file**

```ts
// app/src/lib/course-sequence.ts

export type CourseStep = {
  href: string
  label: string
  type:
    | 'course-intro'
    | 'module-intro'
    | 'lesson-intro'
    | 'lesson-content'
    | 'lesson-outro'
    | 'quiz'
    | 'module-outro'
    | 'graduation'
    | 'certificate'
}

export function buildCourseSequence(
  courseSlug: string,
  modules: Array<{ id: string; slug: string; title: string; quiz_form: unknown }>,
  lessonsByModule: Record<string, Array<{ lesson_index: number; title: string }>>,
): CourseStep[] {
  const steps: CourseStep[] = []
  const base = `/dashboard/course/${courseSlug}`

  steps.push({ href: base, label: 'Welcome', type: 'course-intro' })

  for (const mod of modules) {
    steps.push({
      href: `${base}/${mod.slug}`,
      label: mod.title,
      type: 'module-intro',
    })

    const lessons = lessonsByModule[mod.id] ?? []
    for (const lesson of lessons) {
      const order = lesson.lesson_index + 1
      const lessonBase = `${base}/${mod.slug}/lesson/${order}`
      steps.push({ href: `${lessonBase}/intro`, label: lesson.title, type: 'lesson-intro' })
      steps.push({ href: lessonBase, label: lesson.title, type: 'lesson-content' })
      steps.push({ href: `${lessonBase}/outro`, label: lesson.title, type: 'lesson-outro' })
    }

    if (mod.quiz_form) {
      steps.push({
        href: `${base}/${mod.slug}/quiz`,
        label: `${mod.title} Quiz`,
        type: 'quiz',
      })
    }

    steps.push({
      href: `${base}/${mod.slug}/outro`,
      label: mod.title,
      type: 'module-outro',
    })
  }

  steps.push({ href: `${base}/graduation`, label: 'Graduation', type: 'graduation' })
  steps.push({ href: `${base}/certificate`, label: 'Certificate', type: 'certificate' })

  return steps
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/lib/course-sequence.ts
git commit -m "feat: add buildCourseSequence utility"
```

---

### Task 3: Create `CoursePlayerShell` component

**Files:**
- Create: `app/src/components/course/course-player-shell.tsx`

**Context:** Every course player page wraps its content in this shell. It provides a standardised fixed header (eyebrow + title + sidebar trigger + theme + user) and a fixed footer (Prev / Next). The content area is `overflow-y-auto` by default; pass `scrollable={false}` for the code editor page.

**Step 1: Create the file**

```tsx
// app/src/components/course/course-player-shell.tsx

import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';

interface CoursePlayerShellProps {
  eyebrow: string;
  title: string;
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
  nextLocked: boolean;
  scrollable?: boolean;
  isAuthenticated?: boolean;
  children: React.ReactNode;
}

export function CoursePlayerShell({
  eyebrow,
  title,
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  nextLocked,
  scrollable = true,
  isAuthenticated = false,
  children,
}: CoursePlayerShellProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0" />
        <div className="w-px h-5 bg-border/50 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider uppercase hidden sm:block shrink-0">
            {eyebrow}
          </span>
          <span className="text-border/40 hidden sm:block shrink-0 text-xs">/</span>
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <div className="w-px h-5 bg-border/50 shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          {isAuthenticated && <UserButton />}
        </div>
      </header>

      {/* Content */}
      <div
        className={
          scrollable
            ? 'flex-1 min-h-0 overflow-y-auto'
            : 'flex-1 min-h-0 overflow-hidden flex flex-col'
        }
      >
        {children}
      </div>

      {/* Footer */}
      <footer className="shrink-0 h-12 flex items-center justify-between gap-4 px-6 border-t border-border/30 bg-background/50">
        {prevHref ? (
          <Link
            href={prevHref}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate max-w-[160px]">{prevLabel}</span>
          </Link>
        ) : (
          <div />
        )}

        {nextHref && !nextLocked ? (
          <Link
            href={nextHref}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <span className="truncate max-w-[160px]">{nextLabel}</span>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : nextHref && nextLocked ? (
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/25 cursor-not-allowed select-none">
            <span className="truncate max-w-[160px]">{nextLabel}</span>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        ) : (
          <div />
        )}
      </footer>
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/components/course/course-player-shell.tsx
git commit -m "feat: add CoursePlayerShell component"
```

---

### Task 4: Extend `parseDashboardPath` in sidebar for new routes

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`

**Context:** New routes `/lesson/[order]/intro`, `/lesson/[order]/outro`, and `/[moduleSlug]/outro` need to be recognised by the sidebar so the correct lesson/module shows as active.

**Current code (lines 52–64):**
```ts
function parseDashboardPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const courseIdx = parts.indexOf("course");
  if (courseIdx === -1) return { courseSlug: null, moduleSlug: null, contentType: null, order: null };

  const courseSlug = parts[courseIdx + 1] || null;
  const moduleSlug = parts[courseIdx + 2] || null;
  const contentType = parts[courseIdx + 3] as "lesson" | "quiz" | null;
  const order = contentType === "lesson" ? Number(parts[courseIdx + 4]) || null : null;

  return { courseSlug, moduleSlug, contentType, order };
}
```

**Step 1: Replace `parseDashboardPath`**

Replace the function with:

```ts
function parseDashboardPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const courseIdx = parts.indexOf("course");
  if (courseIdx === -1) return { courseSlug: null, moduleSlug: null, contentType: null, order: null };

  const courseSlug = parts[courseIdx + 1] || null;
  const moduleSlug = parts[courseIdx + 2] || null;
  const segment3 = parts[courseIdx + 3] as string | undefined;

  // /[mod]/outro — module outro page
  if (segment3 === 'outro') {
    return { courseSlug, moduleSlug, contentType: null as "lesson" | "quiz" | null, order: null };
  }

  const contentType = segment3 as "lesson" | "quiz" | null;
  // /[mod]/lesson/[order], /[mod]/lesson/[order]/intro, /[mod]/lesson/[order]/outro
  const order = contentType === "lesson" ? Number(parts[courseIdx + 4]) || null : null;

  return { courseSlug, moduleSlug, contentType, order };
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/components/shared/app-sidebar.tsx
git commit -m "feat: extend parseDashboardPath for /outro and lesson intro/outro routes"
```

---

### Task 5: Create lesson intro page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/intro/page.tsx`

**Context:** This page shows the lesson problem statement as a reading surface before the code challenge. It uses `lessonData.introContent` (rendered via `TemplateRenderer` if present), `problemSummary`, `problemConstraints`, `problemHints`. The "Begin" button is a plain link to `/lesson/[order]` — no API call needed (CodeLessonLayout handles a fresh start). Onboarding gate applies (same as the content page).

**Step 1: Create the file**

```tsx
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getLesson,
  getModule,
  getCourseWithModules,
  getLessonsForCourse,
  getCourseConfidenceResponses,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function LessonIntroPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string; order: string }>;
}) {
  const { courseSlug, moduleSlug, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) notFound();

  const [module, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);
  if (!module || !course) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [lessonData, allLessonsMap, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  if (!lessonData) notFound();

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/intro`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  const contentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={lessonData.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={false}
      isAuthenticated={!!user}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Intro content from DB */}
        {lessonData.introContent != null ? (
          <TemplateRenderer name="lesson-intro" content={lessonData.introContent} />
        ) : null}

        {/* Problem summary */}
        {lessonData.problemSummary ? (
          <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
              Problem
            </p>
            <p className="text-sm text-foreground leading-relaxed">{lessonData.problemSummary}</p>

            {lessonData.problemConstraints.length > 0 && (
              <ul className="space-y-1">
                {lessonData.problemConstraints.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/40 font-mono shrink-0">—</span>
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {/* Hints (collapsible) */}
        {lessonData.problemHints.length > 0 && (
          <details className="rounded-xl border border-border/30 bg-card">
            <summary className="px-5 py-3 text-xs font-mono text-muted-foreground/50 cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              hints ({lessonData.problemHints.length})
            </summary>
            <div className="px-5 pb-4 space-y-2">
              {lessonData.problemHints.map((h, i) => (
                <p key={i} className="text-xs text-muted-foreground">{h}</p>
              ))}
            </div>
          </details>
        )}

        {/* Begin button */}
        <Link
          href={contentHref}
          className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          Begin
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </CoursePlayerShell>
  );
}
```

**Step 2: Verify type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/intro/page.tsx"
git commit -m "feat: add lesson intro page"
```

---

### Task 6: Create lesson outro page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/outro/page.tsx`

**Context:** Shows after passing the code challenge. Guard: if `passed_at IS NULL` → redirect to `/lesson/[order]`. Renders `lessonData.outroContent` if present; fallback is a simple completion message.

**Step 1: Create the file**

```tsx
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import {
  getLesson,
  getModule,
  getCourseWithModules,
  getLessonsForCourse,
  getUserCode,
  getCourseConfidenceResponses,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function LessonOutroPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string; order: string }>;
}) {
  const { courseSlug, moduleSlug, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) notFound();

  const [module, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);
  if (!module || !course) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [lessonData, allLessonsMap, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  if (!lessonData) notFound();

  const userCode = user ? await getUserCode(user.id, lessonData.id) : null;
  const isPassed = !!userCode?.passedAt;

  // Guard: must have passed the challenge to view outro
  if (!isPassed) {
    redirect(`/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`);
  }

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/outro`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={lessonData.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={false}
      isAuthenticated={!!user}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Completion badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20 w-fit">
          <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-success/70 font-mono">Challenge complete</span>
        </div>

        {/* Outro content */}
        {lessonData.outroContent != null ? (
          <TemplateRenderer name="lesson-outro" content={lessonData.outroContent} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Well done completing <span className="text-foreground font-medium">{lessonData.title}</span>. Continue to the next lesson.
          </p>
        )}
      </div>
    </CoursePlayerShell>
  );
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/outro/page.tsx"
git commit -m "feat: add lesson outro page"
```

---

### Task 7: Create module outro page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/outro/page.tsx`

**Context:** Shows after all lessons + quiz in a module are complete. Guard: if not fully completed → redirect to module intro. Content is `mod.outro_content` (already in DB). This content currently lives conditionally on the module intro page — it moves here.

**Step 1: Create the file**

```tsx
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function ModuleOutroPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const { user } = await auth();

  const [course, mod] = await Promise.all([
    getCourseWithModules(courseSlug),
    getModule(moduleSlug),
  ]);
  if (!course || !mod) notFound();

  const modIndex = course.modules.findIndex((m) => m.id === mod.id);
  if (modIndex === -1 || mod.course_id !== course.id) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [allLessonsMap, completionStatus, confidenceResponses] = await Promise.all([
    getLessonsForCourse(moduleIds),
    user?.id
      ? getSectionCompletionStatus(user.id, [mod])
      : Promise.resolve({} as Record<string, SectionStatus>),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  const lessons = allLessonsMap[mod.id] ?? [];
  const lessonsDone = lessons.filter(
    (l) => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed',
  ).length;
  const quizDone = mod.quiz_form
    ? completionStatus[`${mod.id}:quiz`] === 'completed'
    : true; // no quiz = counts as done
  const isCompleted = lessonsDone === lessons.length && quizDone;

  // Guard: must complete all lessons + quiz to view outro
  if (!isCompleted) {
    redirect(`/dashboard/course/${courseSlug}/${moduleSlug}`);
  }

  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/outro`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={mod.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={false}
      isAuthenticated={!!user}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Completion badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20 w-fit">
          <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-success/70 font-mono">Module complete</span>
        </div>

        {mod.outro_content ? (
          <TemplateRenderer name="module-outro" content={mod.outro_content} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;ve completed <span className="text-foreground font-medium">{mod.title}</span>.
          </p>
        )}
      </div>
    </CoursePlayerShell>
  );
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/outro/page.tsx"
git commit -m "feat: add module outro page"
```

---

### Task 8: Simplify `CodeLessonLayout` — remove view state machine

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Context:** The intro/outro views now live on their own pages. Remove: `view` state, `introContent`/`outroContent`/`moduleTitle`/`position`/`lessonCount` props, `LessonOverlay` import and usage, the `Header` JSX block (shell provides the header now), `prevHref`/`nextHref`/`hasNext`/`hasPrev` variables. Replace `setView('outro')` with `router.push(outroHref)` — the page passes the outro href as a new `outroHref` prop.

**Step 1: Replace the full file**

```tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Markdown } from '@/components/shared/markdown';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import { CodeEditor } from '@/components/lesson/code-editor';
import { OutputPanel, ExecutionPhase } from '@/components/lesson/output-panel';
import { parsePythonError, ParsedError } from '@/lib/python-output';
import { useRateLimitActions } from '@/context/rate-limit-context';
import type { TestCase, TestCaseResult, Judge0RunResult, Judge0TestsResult } from '@/lib/judge0';
import type { ExecutionMetrics } from '@/components/lesson/output-panel';

interface CodeLessonLayoutProps {
  lessonTitle: string;
  content: string;
  outroHref: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  savedCode: string | null;
  lessonId: string;
  courseId: string;
  moduleId: string;
  isAuthenticated: boolean;
  isCompleted: boolean;
  lastTestResults: TestCaseResult[] | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
}

export function CodeLessonLayout({
  lessonTitle,
  content,
  outroHref,
  codeTemplate,
  testCases,
  entryPoint,
  solutionCode,
  savedCode,
  lessonId,
  courseId,
  moduleId,
  isAuthenticated,
  isCompleted,
  lastTestResults,
  problemSummary,
  problemConstraints,
  problemHints,
}: CodeLessonLayoutProps) {
  const router = useRouter();
  const { increment: incrementRateLimit } = useRateLimitActions();
  const [code, setCode] = useState(savedCode ?? codeTemplate ?? '');
  const [output, setOutput] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'lesson' | 'code'>('lesson');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingRef = useRef(false);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);

  // Hydrate output panel with persisted test results on mount
  useEffect(() => {
    if (lastTestResults && lastTestResults.length > 0) {
      const allPassed = lastTestResults.every(r => r.pass);
      setTestResults(lastTestResults);
      setExecutionPhase(allPassed ? 'run-pass' : 'run-fail');
      setHasRun(true);
    }
  }, []); // intentional: mount-only

  const handleCodeChange = useCallback((val: string) => {
    setCode(val);
    if (!isAuthenticated) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/code/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, code: val }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        // silently swallow
      }
    }, 1500);
  }, [isAuthenticated, lessonId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (outroTimerRef.current) clearTimeout(outroTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    try {
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
      setTestResults(null);
      setMetrics(null);

      try {
        const hasTests = !!(testCases && testCases.length > 0 && entryPoint);

        const runPromise = fetch('/api/code/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const testPromise = hasTests
          ? fetch('/api/code/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, testCases, entryPoint }),
            })
          : null;

        const [runRes, testRes] = await Promise.all([runPromise, testPromise ?? Promise.resolve(null)]);

        if (!runRes.ok) {
          const msg = 'Execution service unavailable';
          setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
          setExecutionPhase('error');
          return;
        }

        const runResult = await runRes.json() as Judge0RunResult;
        const { stdout, stderr, statusId, time, memory } = runResult;

        setMetrics({ time: time ?? null, memory: memory ?? null });

        if (statusId === 5) {
          setExecutionPhase('tle');
          return;
        }

        if (stderr || (statusId !== 3 && statusId !== 0)) {
          const errorText = stderr || `Runtime error (status ${statusId})`;
          setParsedError(parsePythonError(errorText.trim()));
          setExecutionPhase('error');
          return;
        }

        setHasRun(true);
        setOutput((stdout ?? '').trim());

        if (testRes && testRes.ok) {
          const testResult = await testRes.json() as Judge0TestsResult;
          setTestResults(testResult.tests);
          setExecutionPhase(testResult.allPassed ? 'run-pass' : 'run-fail');

          if (isAuthenticated) {
            fetch('/api/code/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lessonId, code, testResults: testResult.tests }),
            }).catch(() => {});
          }

          if (testResult.allPassed) {
            router.refresh();
            const confetti = (await import('canvas-confetti')).default;
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { x: 0.5, y: 1 },
              colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
              disableForReducedMotion: true,
            });
            if (outroTimerRef.current) clearTimeout(outroTimerRef.current);
            outroTimerRef.current = setTimeout(() => router.push(outroHref), 1800);
          }
        } else {
          setExecutionPhase('run-pass');
        }
      } catch (err: unknown) {
        const message = (err as Error).message ?? 'Network error';
        setParsedError({ errorType: 'Error', message, line: null, raw: message });
        setExecutionPhase('error');
      }
    } finally {
      isExecutingRef.current = false;
    }
  };

  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full overflow-y-auto px-8 py-6">
      <Markdown content={content} />
    </div>
  );

  // ─── Code Pane ──────────────────────────────────────────────────────────────
  const CodePane = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {problemSummary && (
        <ProblemPanel
          problemSummary={problemSummary}
          problemConstraints={problemConstraints}
          problemHints={problemHints}
          testCases={testCases}
          entryPoint={entryPoint}
          onViewSolution={solutionCode ? () => handleCodeChange(solutionCode) : undefined}
        />
      )}
      <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 border-b border-border dark:border-zinc-700">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">editor</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="font-mono text-[10px] text-muted-foreground">saved</span>
          )}
          <button
            onClick={handleRun}
            disabled={executionPhase === 'running'}
            className="flex items-center gap 1 px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {executionPhase === 'running' ? 'running···' : 'run'}
          </button>
        </div>
      </div>
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

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="md:hidden shrink-0 flex border-b border-border bg-muted/50 dark:bg-zinc-900">
        <button onClick={() => setActiveTab('lesson')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'lesson' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>lesson</button>
        <button onClick={() => setActiveTab('code')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'code' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>code</button>
      </div>
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {activeTab === 'lesson' ? ProsePane : CodePane}
      </div>
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">{ProsePane}</div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-zinc-950">{CodePane}</div>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: errors on `lesson/[order]/page.tsx` because it still passes removed props — fix in the next task.

**Step 3: Commit after fixing call site in Task 9**

Do not commit yet — wait until Task 9 is done.

---

### Task 9: Update lesson content page (`lesson/[order]/page.tsx`)

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`

**Context:** Wrap with `CoursePlayerShell`. Remove props now gone from `CodeLessonLayout` (`introContent`, `outroContent`, `moduleTitle`, `position`, `lessonCount`). Add `outroHref`. Fetch all modules' lessons for `buildCourseSequence`. The Next button is locked until `isCompleted`.

**Step 1: Replace file**

```tsx
import { getLesson, getModule, getLessonCount, getUserCode, getCourseWithModules, getLessonsForCourse, getCourseConfidenceResponses, getSubscriptionStatus } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import { CodeLessonLayout } from '@/components/lesson/code-lesson-layout';
import { PaywallOverlay } from '@/components/shared/paywall-overlay';
import { PLAN_ID } from '@/lib/paypal';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';

interface LessonPageProps {
  params: Promise<{ courseSlug: string; moduleSlug: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, moduleSlug, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [module, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);
  if (!module || !course) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [lessonData, lessonCount, allLessonsMap, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonCount(module.id),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  if (!lessonData) {
    notFound();
  }

  const userCode = user ? await getUserCode(user.id, lessonData.id) : null;
  const isCompleted = !!userCode?.passedAt;

  const subscription = user ? await getSubscriptionStatus(user.id) : null;
  const isPaid = subscription?.status === 'ACTIVE';

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;
  const outroHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/outro`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={lessonData.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={!isCompleted}
      scrollable={false}
      isAuthenticated={!!user}
    >
      {!isPaid && <PaywallOverlay planId={PLAN_ID} />}
      <CodeLessonLayout
        lessonTitle={lessonData.title}
        content={lessonData.content}
        outroHref={outroHref}
        codeTemplate={lessonData.codeTemplate}
        testCases={lessonData.testCases}
        entryPoint={lessonData.entryPoint}
        solutionCode={lessonData.solutionCode}
        savedCode={userCode?.code ?? null}
        lastTestResults={userCode?.lastTestResults ?? null}
        problemSummary={lessonData.problemSummary}
        problemConstraints={lessonData.problemConstraints}
        problemHints={lessonData.problemHints}
        lessonId={lessonData.id}
        courseId={courseSlug}
        moduleId={moduleSlug}
        isAuthenticated={!!user}
        isCompleted={isCompleted}
      />
    </CoursePlayerShell>
  );
}
```

**Step 2: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit Tasks 8 + 9 together**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx \
        "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx"
git commit -m "feat: remove view state from CodeLessonLayout, wrap lesson content with CoursePlayerShell"
```

---

### Task 10: Update quiz page with `CoursePlayerShell`

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`

**Context:** Add `CoursePlayerShell`. Quiz Next is locked until quiz is passed. Fetch all modules' lessons for `buildCourseSequence`.

**Step 1: Read the current file**

Read `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx` first.

**Step 2: Add imports at the top**

Add to existing imports:
```ts
import { getLessonsForCourse } from '@/lib/data';  // already imported, just add to destructure
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
```

**Step 3: In the data fetching, add `getLessonsForCourse(allModuleIds)`**

After `getCourseWithModules`, add:
```ts
const allModuleIds = course.modules.map((m) => m.id);
const allLessonsMap = await getLessonsForCourse(allModuleIds);
```

(The existing code already fetches `getLessonsForCourse([mod.id])` — replace with `allModuleIds` to get all lessons.)

**Step 4: Compute shell props**

```ts
const modIndex = course.modules.findIndex((m) => m.id === mod.id);
const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Quiz`;

const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/quiz`;
const currentIdx = steps.findIndex((s) => s.href === currentHref);
const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
```

**Step 5: Wrap the return in `CoursePlayerShell`**

Wrap the existing return JSX:
```tsx
return (
  <CoursePlayerShell
    eyebrow={eyebrow}
    title={quizForm.title}
    prevHref={prevStep?.href ?? null}
    prevLabel={prevStep?.label ?? null}
    nextHref={nextStep?.href ?? null}
    nextLabel={nextStep?.label ?? null}
    nextLocked={!isQuizCompleted}
    isAuthenticated={!!user}
  >
    {/* existing quiz content div goes here */}
  </CoursePlayerShell>
);
```

Remove the outer `<div className="flex-1 overflow-auto">` wrapper since the shell provides it.

**Step 6: Verify**

```bash
cd app && npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx"
git commit -m "feat: wrap quiz page with CoursePlayerShell"
```

---

### Task 11: Update module intro page with `CoursePlayerShell`

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`

**Context:** Wrap with shell. Remove the `outro_content` block (moved to module outro page). Remove the contextual CTA button (prev/next footer replaces it). Module Next is always unlocked (footer Next → Lesson 1 intro). Change `getLessonsForCourse([mod.id])` to fetch all modules.

**Step 1: Update imports**

Add:
```ts
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
```

**Step 2: Fetch all lessons**

Change `getLessonsForCourse([mod.id])` to `getLessonsForCourse(moduleIds)` where `moduleIds = course.modules.map(m => m.id)`.

**Step 3: Compute shell props**

```ts
const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')}`;

const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}`;
const currentIdx = steps.findIndex((s) => s.href === currentHref);
const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
```

**Step 4: Update JSX**

- Remove the `outro_content` conditional block
- Remove the contextual CTA `<Link>` button
- Wrap in `CoursePlayerShell`
- Remove outer `<div className="flex-1 overflow-auto">` (shell provides it)
- Keep: breadcrumb, header (eyebrow + h1 + description), intro_content, lesson list

Actually: the shell now provides the eyebrow + h1. Remove the manual eyebrow/h1 block inside content and keep only the description + intro_content + lesson list. The breadcrumb can also be removed since the shell header shows the hierarchy.

**Step 5: Verify**

```bash
cd app && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx"
git commit -m "feat: wrap module intro page with CoursePlayerShell, remove outro block"
```

---

### Task 12: Update course welcome, graduation, certificate pages

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx`

**Context:** All three get `CoursePlayerShell`. Each needs `getLessonsForCourse(allModuleIds)` to build the sequence. Course welcome's Next is locked until onboarding submitted. Graduation's Next locked until completion form submitted. Certificate has no Next (end of sequence). Remove outer `flex-1 overflow-auto` div from each. Remove breadcrumbs (shell header shows context).

**Step 1: Add to course welcome (`[courseSlug]/page.tsx`)**

Add imports:
```ts
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
```

Compute shell props (add after existing data fetching):
```ts
const steps = buildCourseSequence(courseSlug, course.modules, lessonsByModule);
const currentHref = `/dashboard/course/${courseSlug}`;
const currentIdx = steps.findIndex((s) => s.href === currentHref);
const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
const nextLocked = !onboardingSubmitted;
```

Wrap return with shell:
```tsx
<CoursePlayerShell
  eyebrow={course.tag ? titleCase(course.tag) : 'Course'}
  title={course.title}
  prevHref={prevStep?.href ?? null}
  prevLabel={prevStep?.label ?? null}
  nextHref={nextStep?.href ?? null}
  nextLabel={nextStep?.label ?? null}
  nextLocked={nextLocked}
  isAuthenticated={!!user}
>
  {/* existing inner content, remove outer flex-1 overflow-auto div */}
</CoursePlayerShell>
```

Remove: the inline progress CTA `<Link>` button (footer Next replaces "Start course" / "Continue learning") OR keep it as a prominent inline CTA since it links directly to the resume point (not just the next step). The footer Next goes to Module 1 intro; the inline CTA goes to the first incomplete lesson. **Keep the inline CTA** — it serves a different purpose.

**Step 2: Add to graduation (`graduation/page.tsx`)**

Same pattern. Graduation Next is locked until `completionSubmitted`:
```ts
const steps = buildCourseSequence(courseSlug, course.modules, lessonsByModule);
const currentHref = `/dashboard/course/${courseSlug}/graduation`;
const currentIdx = steps.findIndex((s) => s.href === currentHref);
const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
```

Shell:
```tsx
<CoursePlayerShell
  eyebrow="Graduation"
  title={course.title}
  prevHref={prevStep?.href ?? null}
  prevLabel={prevStep?.label ?? null}
  nextHref={nextStep?.href ?? null}
  nextLabel={nextStep?.label ?? null}
  nextLocked={!completionSubmitted}
  isAuthenticated={!!user}
>
```

Remove breadcrumb.

**Step 3: Add to certificate (`certificate/page.tsx`)**

Same pattern. No `nextLocked` (end of sequence, `nextStep` will be null from `buildCourseSequence`):
```tsx
<CoursePlayerShell
  eyebrow="Certificate"
  title={course.title}
  prevHref={prevStep?.href ?? null}
  prevLabel={prevStep?.label ?? null}
  nextHref={null}
  nextLabel={null}
  nextLocked={false}
  isAuthenticated={!!user}
>
```

Remove breadcrumb.

**Step 4: Verify**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**

```bash
git add "app/src/app/dashboard/course/[courseSlug]/page.tsx" \
        "app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx" \
        "app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx"
git commit -m "feat: wrap course welcome, graduation, certificate with CoursePlayerShell"
```

---

### Task 13: Delete `LessonOverlay` component

**Files:**
- Delete: `app/src/components/lesson/lesson-overlay.tsx`

**Context:** Now that intro/outro are separate pages and `CodeLessonLayout` no longer uses `LessonOverlay`, the file is unused. Delete it.

**Step 1: Delete the file**

```bash
rm app/src/components/lesson/lesson-overlay.tsx
```

**Step 2: Verify no remaining imports**

```bash
grep -r "lesson-overlay\|LessonOverlay" app/src --include="*.tsx" --include="*.ts"
```
Expected: no output.

**Step 3: Verify type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete LessonOverlay (replaced by lesson intro/outro pages)"
```

---

### Task 14: Final verification

**Step 1: Full type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

**Step 2: Build check**

```bash
cd app && npm run build
```
Expected: successful build, no errors.

**Step 3: Manual smoke test**

```bash
cd app && npm run dev
```

Check these flows:
1. Navigate to `/dashboard/course/[slug]` → shell header + footer visible, no DashboardHeader duplicate
2. Click Next on course welcome → goes to module 1 intro (if onboarding done)
3. Navigate to `/dashboard/course/[slug]/[mod]/lesson/1/intro` → intro page loads with Begin button
4. Click Begin → navigates to `/lesson/1` (code editor with shell)
5. Submit passing code → confetti fires → after 1800ms navigates to `/lesson/1/outro`
6. Outro shows completion badge + Next unlocked → clicking Next goes to lesson 2 intro
7. Complete all lessons → quiz page loads with shell, Next locked until quiz passed
8. Pass quiz → Next goes to module outro
9. Module outro Next → next module intro or graduation
10. Sidebar: correct lesson/module highlighted for all new routes

**Step 4: Commit**

```bash
git commit --allow-empty -m "chore: final verification complete"
```
