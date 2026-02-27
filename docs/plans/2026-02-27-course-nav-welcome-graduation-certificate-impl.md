# Course Nav: Welcome + Graduation + Certificate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add Welcome, Graduation, and Certificate as course-level sidebar navigation items, replace the cluttered conditional course overview with a clean Welcome page, and create dedicated Graduation and Certificate pages.

**Architecture:** Three new/repurposed routes at `/dashboard/course/[slug]` (Welcome), `/dashboard/course/[slug]/graduation`, and `/dashboard/course/[slug]/certificate`. Sidebar gets three course-level nav items using `Sparkles`, `GraduationCap`, and `Award` lucide icons. Active state detected via `parseDashboardPath` — graduation/certificate URLs set `moduleSlug` to `'graduation'`/`'certificate'` in the existing URL parser. Delete the now-superseded `/onboarding` and `/completion` pages.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, lucide-react.

---

## Task 1: Sidebar — remove survey buttons, add Welcome/Graduation/Certificate items

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`

### Context

Current sidebar (course mode) after the previous task:
1. Course title block (`px-3 pb-3 border-b`) — contains `<Link>` to course overview, progress bar, AND the pre-survey/post-survey button div (lines 298-313)
2. Module accordion (`SidebarGroup`)

Target structure:
1. Course title block — keep title + progress, **remove** survey buttons
2. Welcome link — immediately before the module accordion
3. Module accordion — unchanged
4. Graduation + Certificate links — immediately after the module accordion

Active state detection uses the already-computed `moduleSlug` from `parseDashboardPath`:
- Welcome: `moduleSlug === null` (on `/dashboard/course/[slug]`)
- Graduation: `moduleSlug === 'graduation'`
- Certificate: `moduleSlug === 'certificate'`

Current imports include `GraduationCap` (already present). Add `Sparkles` and `Award`.

---

### Step 1: Add Sparkles and Award to the lucide-react import

Find the lucide-react import line:
```typescript
import {
  BookOpen,
  CircleDot,
  Diamond,
  Flame,
  GraduationCap,
  Home,
  Target,
  Timer,
} from "lucide-react";
```

Add `Sparkles` and `Award`:
```typescript
import {
  Award,
  BookOpen,
  CircleDot,
  Diamond,
  Flame,
  GraduationCap,
  Home,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
```

---

### Step 2: Remove the pre-survey/post-survey buttons block

In the course title block, find and remove this entire block:
```typescript
              {activeCourse.confidence_form && (
                <div className="flex gap-2 mt-2">
                  <Link
                    href={`/dashboard/course/${activeCourse.slug}/onboarding`}
                    className="flex-1 text-center text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    pre-survey
                  </Link>
                  <Link
                    href={`/dashboard/course/${activeCourse.slug}/completion`}
                    className="flex-1 text-center text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    post-survey
                  </Link>
                </div>
              )}
```

---

### Step 3: Add Welcome link before the module accordion

Find:
```typescript
            {/* Module accordion */}
            <SidebarGroup className="py-1">
```

Insert immediately before it:
```typescript
            {/* Course-level nav: Welcome */}
            <div className="px-1 mb-1">
              <Link
                href={`/dashboard/course/${activeCourse.slug}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                  !moduleSlug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Welcome</span>
              </Link>
            </div>
```

---

### Step 4: Add Graduation and Certificate links after the module accordion

Find the closing tags of the module accordion:
```typescript
              </SidebarGroupContent>
            </SidebarGroup>
          </>
```

Insert between `</SidebarGroup>` and `</>`:
```typescript
            {/* Course-level nav: Graduation + Certificate */}
            <div className="px-1 mt-1 space-y-0.5">
              <Link
                href={`/dashboard/course/${activeCourse.slug}/graduation`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                  moduleSlug === 'graduation'
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span>Graduation</span>
              </Link>
              <Link
                href={`/dashboard/course/${activeCourse.slug}/certificate`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                  moduleSlug === 'certificate'
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Award className="h-3.5 w-3.5 shrink-0" />
                <span>Certificate</span>
              </Link>
            </div>
```

---

### Step 5: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 6: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/shared/app-sidebar.tsx
git commit -m "feat: add Welcome/Graduation/Certificate course-level sidebar items; remove survey buttons"
```

---

## Task 2: Repurpose course overview as Welcome page

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

### Context

The current overview page has a complex conditional block that shows one of:
- Onboarding form (if not started + not submitted)
- Completion form (if completed + not submitted)
- ReportCard + Certificate (if completed + both submitted)
- Progress CTA (otherwise)

It also shows the course outro inline. All of this is replaced with:
- Always-visible onboarding form (or "submitted" badge) — for the onboarding survey
- Simple progress CTA (always shown)
- Remove: completion form, ReportCard, CourseCertificate, course outro, survey links row

Unused imports after changes: `OnboardingFormWrapper` stays, `CompletionFormWrapper`, `ReportCard`, `CourseCertificate` are removed.

---

### Step 1: Remove unused imports

Remove these three imports from the import block at the top:
```typescript
import { ReportCard } from '@/components/dashboard/report-card';
import { CourseCertificate } from '@/components/dashboard/course-certificate';
```

Also remove from the `course-form-wrappers` import:
```typescript
import { OnboardingFormWrapper, CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';
```
Change to:
```typescript
import { OnboardingFormWrapper } from '@/components/dashboard/course-form-wrappers';
```

Also remove the `ConfidenceForm` named import (no longer needed for the cast):
```typescript
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type ConfidenceForm,
  type SectionStatus,
} from '@/lib/data';
```
Change to:
```typescript
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
```

---

### Step 2: Remove unused computed variables from the server component

In the server component body, remove:
- `const isCompleted = ...` (line ~76)
- `const completionDate = ...`
- `const studentName = ...`

Keep: `onboardingSubmitted`, `completionSubmitted` (still needed for display), `hasStarted`, `progressPct`, `resumeHref`, `totalItems`, `completedItems`.

---

### Step 3: Replace the JSX content blocks

**Remove the survey links row** (the entire block):
```typescript
        {/* ─── Survey links ─────────────────────────────────────── */}
        {user && course.confidence_form && (
          <div className="flex gap-3">
            ...
          </div>
        )}
```

**Replace the entire `{/* ─── Progress + CTA / Onboarding form / Completion form ── */}` block** with two separate simple blocks:

Replace from `{/* ─── Progress + CTA ... */}` through the closing `)}` of that block with:

```typescript
        {/* ─── Onboarding survey ──────────────────────────────── */}
        {user && course.confidence_form && (
          onboardingSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Pre-course survey completed</span>
            </div>
          ) : (
            <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
          )
        )}

        {/* ─── Progress CTA ───────────────────────────────────── */}
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
```

**Remove the course outro block** entirely:
```typescript
        {/* ─── Course outro (completed) ───────────────────────────── */}
        {isCompleted && course.outro_content ? (
          <div className="rounded-xl border border-success/20 bg-success/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-success/50 mb-4">
              Course complete
            </p>
            <TemplateRenderer name="course-outro" content={course.outro_content} />
          </div>
        ) : null}
```

---

### Step 4: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors. If there are errors about removed variables (`isCompleted`, `studentName`, `completionDate`), remove any remaining references to them.

---

### Step 5: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/page.tsx'
git commit -m "feat: repurpose course overview as Welcome page (onboarding form + progress CTA)"
```

---

## Task 3: Create /graduation page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx`

### Context

Graduation shows the course outro template + completion form. It needs to know if the course is completed (to decide whether to show the form or a locked state) and whether the completion form is already submitted.

Compute `isCompleted` the same way the old course overview page did: fetch completion status for all module lessons + quizzes, compare to total.

---

### Step 1: Create the file

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
import { TemplateRenderer } from '@/components/templates/template-renderer';
import { CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';

export default async function GraduationPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [{ user }, course] = await Promise.all([
    auth(),
    getCourseWithModules(courseSlug),
  ]);
  if (!course) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [completionStatus, lessonsByModule, confidenceResponses] = await Promise.all([
    user?.id
      ? getSectionCompletionStatus(user.id, course.modules)
      : Promise.resolve({} as Record<string, SectionStatus>),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  let totalItems = 0;
  let completedItems = 0;
  for (const mod of course.modules) {
    const lessons = lessonsByModule[mod.id] ?? [];
    totalItems += lessons.length + (mod.quiz_form ? 1 : 0);
    for (const l of lessons) {
      if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed') completedItems++;
    }
    if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] === 'completed') completedItems++;
  }
  const isCompleted = totalItems > 0 && completedItems === totalItems;
  const completionSubmitted = confidenceResponses.completion !== null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Link
            href={`/dashboard/course/${courseSlug}`}
            className="hover:text-muted-foreground transition-colors"
          >
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-foreground/70">Graduation</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Graduation
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
        </div>

        {/* Course outro */}
        {course.outro_content ? (
          <div className="rounded-xl border border-success/20 bg-success/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-success/50 mb-4">
              Course complete
            </p>
            <TemplateRenderer name="course-outro" content={course.outro_content} />
          </div>
        ) : null}

        {/* Completion survey */}
        {course.confidence_form ? (
          !user ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to complete the post-course survey.</p>
            </div>
          ) : !isCompleted ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Complete the course first</p>
              <p className="text-xs text-muted-foreground">Finish all lessons and quizzes to unlock the post-course survey.</p>
              <Link
                href={`/dashboard/course/${courseSlug}`}
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-mono text-primary hover:underline"
              >
                Back to course →
              </Link>
            </div>
          ) : completionSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Post-course survey completed</span>
            </div>
          ) : (
            <CompletionFormWrapper courseId={course.id} form={course.confidence_form} />
          )
        ) : null}

      </div>
    </div>
  );
}
```

---

### Step 2: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 3: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx'
git commit -m "feat: add /graduation page (course outro + completion survey)"
```

---

## Task 4: Create /certificate page

**Files:**
- Create: `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx`

### Context

The certificate page shows `ReportCard` (if both surveys submitted) and `CourseCertificate`. If the course isn't completed yet, show a locked state. The `CourseCertificate` and `ReportCard` components already exist and were previously used in the course overview page.

---

### Step 1: Create the file

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type ConfidenceForm,
  type SectionStatus,
} from '@/lib/data';
import { ReportCard } from '@/components/dashboard/report-card';
import { CourseCertificate } from '@/components/dashboard/course-certificate';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [{ user }, course] = await Promise.all([
    auth(),
    getCourseWithModules(courseSlug),
  ]);
  if (!course) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [completionStatus, lessonsByModule, confidenceResponses] = await Promise.all([
    user?.id
      ? getSectionCompletionStatus(user.id, course.modules)
      : Promise.resolve({} as Record<string, SectionStatus>),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  let totalItems = 0;
  let completedItems = 0;
  for (const mod of course.modules) {
    const lessons = lessonsByModule[mod.id] ?? [];
    totalItems += lessons.length + (mod.quiz_form ? 1 : 0);
    for (const l of lessons) {
      if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed') completedItems++;
    }
    if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] === 'completed') completedItems++;
  }
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  const bothSubmitted =
    confidenceResponses.onboarding !== null &&
    confidenceResponses.completion !== null;

  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const studentName = user?.email ?? 'Student';

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Link
            href={`/dashboard/course/${courseSlug}`}
            className="hover:text-muted-foreground transition-colors"
          >
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-foreground/70">Certificate</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Certificate
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
        </div>

        {!isCompleted ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Not yet earned</p>
            <p className="text-xs text-muted-foreground mb-4">Complete all lessons and quizzes to earn your certificate.</p>
            <Link
              href={`/dashboard/course/${courseSlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
            >
              Back to course →
            </Link>
          </div>
        ) : (
          <>
            {/* Report card — only when both surveys are done */}
            {bothSubmitted && course.confidence_form && (
              <ReportCard
                questions={(course.confidence_form as ConfidenceForm).questions}
                onboarding={confidenceResponses.onboarding!}
                completion={confidenceResponses.completion!}
              />
            )}

            {/* Certificate */}
            <CourseCertificate
              studentName={studentName}
              courseTitle={course.title}
              completionDate={completionDate}
            />
          </>
        )}

      </div>
    </div>
  );
}
```

---

### Step 2: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 3: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx'
git commit -m "feat: add /certificate page (ReportCard + CourseCertificate)"
```

---

## Task 5: Delete /onboarding and /completion pages

**Files:**
- Delete: `app/src/app/dashboard/course/[courseSlug]/onboarding/page.tsx`
- Delete: `app/src/app/dashboard/course/[courseSlug]/completion/page.tsx`

### Context

These standalone pages were created in the previous task but are now superseded by the Welcome page (onboarding form) and Graduation page (completion form).

---

### Step 1: Delete the two files

```bash
rm 'app/src/app/dashboard/course/[courseSlug]/onboarding/page.tsx'
rm 'app/src/app/dashboard/course/[courseSlug]/completion/page.tsx'
rmdir 'app/src/app/dashboard/course/[courseSlug]/onboarding' 2>/dev/null || true
rmdir 'app/src/app/dashboard/course/[courseSlug]/completion' 2>/dev/null || true
```

---

### Step 2: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 3: Verify no remaining references

```bash
grep -rn "onboarding/page\|completion/page\|/onboarding\"\|/completion\"" \
  /Users/harshitchoudhary/Documents/projects/zuzucodes/app/src \
  --include="*.tsx" --include="*.ts"
```

Expected: zero results (the old links in sidebar/overview page were already removed in Tasks 1 and 2).

---

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add -A
git commit -m "chore: delete superseded /onboarding and /completion pages"
```
