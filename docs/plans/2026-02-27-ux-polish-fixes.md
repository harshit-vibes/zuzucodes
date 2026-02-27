# UX Polish Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix 5 UX issues: lesson intro re-showing on return, sidebar circle visibility, lesson header clutter, lesson outro style, quiz header verbosity, and course form discoverability.

**Architecture:** All client-side React + Next.js App Router changes. No DB schema changes. New pages for course forms reuse existing `OnboardingFormWrapper`/`CompletionFormWrapper` components. Sidebar nav fixes and `sessionStorage` for intro persistence are pure UI.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, `sessionStorage` API.

---

## Task 1: Lesson intro persistence + sidebar circle dark-theme fix

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`
- Modify: `app/src/components/shared/app-sidebar.tsx`

### Context

**Intro re-showing:** `view` state is initialised on every server render with `isCompleted || savedCode !== null ? 'content' : 'intro'`. If a user has seen the intro but hasn't typed any code yet (`savedCode === null`) and the lesson isn't completed, navigating away and back resets `view` to `'intro'`.

Fix: persist "intro has been dismissed for this lesson" in `sessionStorage` under the key `intro:${lessonId}`. On mount, if that key exists, skip straight to `'content'`.

**Sidebar circle:** Not-started lesson items use `ring-1 ring-border/40` — nearly invisible in dark mode. Fix: `ring-border/40` → `ring-border/60`.

---

### Step 1: Patch `CodeLessonLayout` for intro persistence

File: `app/src/components/lesson/code-lesson-layout.tsx`

The component currently sets:
```typescript
const [view, setView] = useState<'intro' | 'content' | 'outro'>(
  isCompleted || savedCode !== null ? 'content' : 'intro'
);
```

**Add a `useEffect` (mount-only) that checks sessionStorage and skips to content:**

After the existing `useState` for `view`, add:
```typescript
// Skip intro if user has already seen it this session
useEffect(() => {
  if (view === 'intro' && sessionStorage.getItem(`intro:${lessonId}`)) {
    setView('content');
  }
}, []); // intentional: mount-only
```

**Update the `onEnterLesson` handler** passed to `LessonOverlay`. Find `onEnterLesson={() => setView('content')}` and replace with:
```typescript
onEnterLesson={() => {
  sessionStorage.setItem(`intro:${lessonId}`, '1');
  setView('content');
}}
```

> `lessonId` is already a prop on `CodeLessonLayout`.

---

### Step 2: Fix sidebar circle in dark mode

File: `app/src/components/shared/app-sidebar.tsx`

Find (around line 162):
```typescript
<div className="h-3.5 w-3.5 rounded-full ring-1 ring-border/40 shrink-0" />
```

Replace with:
```typescript
<div className="h-3.5 w-3.5 rounded-full ring-1 ring-border shrink-0" />
```

---

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/lesson/code-lesson-layout.tsx \
        app/src/components/shared/app-sidebar.tsx
git commit -m "fix: persist lesson intro dismissal in sessionStorage; fix sidebar circle in dark mode"
```

---

## Task 2: Remove N/M progress bar from lesson header

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

### Context

The lesson header currently has a mini progress bar and `{position}/{lessonCount}` counter. The sidebar already shows lesson progress, so this is redundant clutter. Remove it.

---

### Step 1: Remove the progress bar block from Header

In `app/src/components/lesson/code-lesson-layout.tsx`, find the `Header` JSX (around line 291). Remove this entire block (the separator + progress div + count span):

```typescript
      <div className="w-px h-5 bg-border/50 shrink-0" />
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-16 h-0.5 bg-border/40 rounded-full overflow-hidden">
          <div className="h-full bg-primary/70 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums">{position}/{lessonCount}</span>
      </div>
```

> There are two `<div className="w-px h-5 bg-border/50 shrink-0" />` separators in the header. Remove the one immediately before the progress block (not the one after the sidebar trigger).

### Step 2: Remove unused `progress` variable

Find and remove:
```typescript
  const progress = (position / lessonCount) * 100;
```

> `position` and `lessonCount` props remain — they're still used in `nextHref`/`hasPrev`/`hasNext` logic.

---

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "fix: remove N/M progress bar from lesson player header"
```

---

## Task 3: Lesson outro — clean top bar + clickable "Up next" block

**Files:**
- Modify: `app/src/components/lesson/lesson-overlay.tsx`
- Modify: `app/src/components/templates/lesson-outro.tsx`

### Context

**Top bar:** The `LessonOverlay` renders a top nav for both intro and outro showing `{position} / {lessonCount}` in the center and prev/next links. The user wants this cleaned up for the outro: no N/M counter, no "next" link at top. The outro should have no top nav bar at all — navigation happens through the "Up next" block and "Back to lesson" button.

**Clickable "Up next":** `LessonOutroTemplate` renders a styled div with teaser text. It should be a `<Link>` navigating to `nextHref`. Pass `nextHref` as a prop to the template, and render the outro directly in `LessonOverlay` (special-cased) rather than via `renderTemplate`.

---

### Step 1: Add `nextHref` prop to `LessonOutroTemplate`

File: `app/src/components/templates/lesson-outro.tsx`

Add `Link` import at the top:
```typescript
import Link from 'next/link';
```

Update the `Props` interface:
```typescript
interface Props {
  content: TemplateContent<'lesson-outro'>;
  nextHref?: string;
}
```

Update the function signature:
```typescript
export function LessonOutroTemplate({ content, nextHref }: Props) {
```

Replace the "Up next" block:
```typescript
      {content.next_lesson_teaser && nextHref ? (
        <Link
          href={nextHref}
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 hover:bg-primary/10 transition-colors cursor-pointer"
        >
          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight aria-hidden="true" className="w-4 h-4 text-primary/60 shrink-0 mt-1" />
        </Link>
      ) : content.next_lesson_teaser ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight aria-hidden="true" className="w-4 h-4 text-primary/30 shrink-0 mt-1" />
        </div>
      ) : null}
```

---

### Step 2: Update `LessonOverlay` — remove outro top bar, pass nextHref

File: `app/src/components/lesson/lesson-overlay.tsx`

**Add import at top:**
```typescript
import { LessonOutroTemplate } from '@/components/templates/lesson-outro';
import type { TemplateContent } from '@/lib/templates/types';
```

**Replace the top navigation bar block:**

Find:
```typescript
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
        <div className="w-20">
          {view === 'intro' && hasPrev ? (
            <Link
              href={prevHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              prev
            </Link>
          ) : null}
        </div>

        <span className="font-mono text-[11px] text-muted-foreground/40 tabular-nums">
          {position} / {lessonCount}
        </span>

        <div className="w-20 flex justify-end">
          {(view === 'outro' || (view === 'intro' && hasNext)) ? (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              next
              <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
```

Replace with (show top nav only on intro):
```typescript
      {/* Top navigation bar — intro only */}
      {view === 'intro' && (
        <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
          <div className="w-20">
            {hasPrev ? (
              <Link
                href={prevHref}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                prev
              </Link>
            ) : null}
          </div>

          <span className="font-mono text-[11px] text-muted-foreground/40 tabular-nums">
            {position} / {lessonCount}
          </span>

          <div className="w-20 flex justify-end">
            {hasNext ? (
              <Link
                href={nextHref}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                next
                <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>
      )}
```

**Replace the template render block** (inside the centered content section):

Find:
```typescript
          {/* Template content */}
          {content != null
            ? renderTemplate(templateName, content)
            : (
              <p className="text-sm text-muted-foreground/60">
                {view === 'intro' ? 'Ready to begin.' : 'Lesson complete.'}
              </p>
            )}
```

Replace with:
```typescript
          {/* Template content */}
          {view === 'outro' && outroContent != null ? (
            <LessonOutroTemplate
              content={outroContent as TemplateContent<'lesson-outro'>}
              nextHref={hasNext ? nextHref : undefined}
            />
          ) : view === 'intro' && introContent != null ? (
            renderTemplate('lesson-intro', introContent)
          ) : (
            <p className="text-sm text-muted-foreground/60">
              {view === 'intro' ? 'Ready to begin.' : 'Lesson complete.'}
            </p>
          )}
```

---

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/lesson/lesson-overlay.tsx \
        app/src/components/templates/lesson-outro.tsx
git commit -m "feat: clean lesson outro top bar; make 'Up next' block a clickable link"
```

---

## Task 4: Quiz header simplification

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`
- Modify: `app/src/components/dashboard/header.tsx`

### Context

The quiz page currently has:
1. `DashboardHeader` (ThemeToggle + UserButton) — always rendered by layout
2. A `border-b` breadcrumb section inside the page
3. A centered `<header>` block with module badge + quiz title + meta (N questions · X% to pass)

This is three layers. Remove the inner breadcrumb section entirely (the sidebar already shows context). Simplify the centered header to remove the meta row — the player itself shows question numbers inline. Also update `DashboardHeader` to hide on quiz pages (quiz gets its own header-less layout, consistent with lessons not showing DashboardHeader).

Wait — actually lessons have their own full header. Quizzes currently use DashboardHeader. For consistency, the simplest approach is: keep DashboardHeader on quiz pages (it's unobtrusive — just ThemeToggle + UserButton on the right), and just remove the inner redundant breadcrumb section from the quiz page itself. This cuts the height significantly.

---

### Step 1: Remove breadcrumb section from quiz page

File: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`

Remove the `Breadcrumb` import at the top:
```typescript
import { Breadcrumb } from '@/components/shared/breadcrumb';
```

Remove the entire header div block:
```typescript
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: mod.title },
              { label: 'Quiz' },
            ]}
          />
        </div>
      </div>
```

---

### Step 2: Simplify the centered quiz header

Find the centered header block:
```typescript
        {/* Quiz header */}
        <header className="max-w-2xl mx-auto text-center mb-10">
          {/* Module badge */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="label-mono text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              {mod.title}
            </span>
            {isCompleted && (
              <span className="label-mono text-success bg-success/10 px-2.5 py-1 rounded-md">
                Passed
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-semibold mb-3">
            {quizForm.title}
          </h1>

          {/* Quiz meta */}
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizForm.questions.length} questions
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizForm.passingScore}% to pass
            </span>
          </div>
        </header>
```

Replace with the simplified version:
```typescript
        {/* Quiz header */}
        <header className="max-w-2xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="label-mono text-muted-foreground/60 bg-muted px-2.5 py-1 rounded-md">
              {mod.title}
            </span>
            {isCompleted && (
              <span className="label-mono text-success bg-success/10 px-2.5 py-1 rounded-md">
                Passed
              </span>
            )}
          </div>
          <h1 className="font-display text-xl font-semibold mb-1">
            {quizForm.title}
          </h1>
          <p className="text-xs text-muted-foreground/60 font-mono">
            {quizForm.questions.length} questions · {quizForm.passingScore}% to pass
          </p>
        </header>
```

---

### Step 3: TypeScript check

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit 2>&1
```

Expected: zero errors.

---

### Step 4: Commit

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add 'app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx'
git commit -m "fix: simplify quiz page header — remove breadcrumb, compact title"
```

---

## Task 5: Course form routes + sidebar nav fixes

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`
- Create: `app/src/app/dashboard/course/[courseSlug]/onboarding/page.tsx`
- Create: `app/src/app/dashboard/course/[courseSlug]/completion/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

### Context

**Sidebar problems:**
1. Clicking the course title in the sidebar navigates to `/dashboard` (wrong — should go to course overview)
2. A `< Dashboard` back-link exists in the sidebar — redundant since the zuzu.codes logo already links to dashboard

**Course form discoverability:**
The onboarding (`Before you begin`) and completion (`Now that you're done`) confidence forms are embedded in the course overview page with conditional visibility. Users can't find them if they've already started. Create dedicated pages for both.

**`CourseWithModules`** already includes `confidence_form: ConfidenceForm | null` — the sidebar already has this data, no extra queries needed.

---

### Step 1: Fix sidebar course title link + remove Dashboard back-link

File: `app/src/components/shared/app-sidebar.tsx`

**Remove the `< Dashboard` block entirely.** Find and delete:
```typescript
            {/* Back to Dashboard */}
            <SidebarGroup className="pb-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="rounded-lg hover:bg-muted/60 text-muted-foreground"
                    >
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1.5">
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="text-xs">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
```

Also remove the `ChevronLeft` import from the lucide-react import list (it's only used there).

**Fix the course title link.** Find:
```typescript
            {/* Course title + progress */}
            <div className="px-3 pb-3 border-b border-border/50 mb-2">
              <Link
                href="/dashboard"
                className="block group"
              >
```

Replace `href="/dashboard"` with `href={`/dashboard/course/${activeCourse.slug}`}`:
```typescript
            {/* Course title + progress */}
            <div className="px-3 pb-3 border-b border-border/50 mb-2">
              <Link
                href={`/dashboard/course/${activeCourse.slug}`}
                className="block group"
              >
```

**Add survey links below course title** (inside the same `<div className="px-3 pb-3 ...">`, after the progress block). Append before the closing `</div>` of the course title block:

```typescript
              {activeCourse.confidence_form && (
                <div className="flex gap-2 mt-2">
                  <Link
                    href={`/dashboard/course/${activeCourse.slug}/onboarding`}
                    className={`flex-1 text-center text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors`}
                  >
                    pre-survey
                  </Link>
                  <Link
                    href={`/dashboard/course/${activeCourse.slug}/completion`}
                    className={`flex-1 text-center text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors`}
                  >
                    post-survey
                  </Link>
                </div>
              )}
```

---

### Step 2: Create onboarding page

Create file: `app/src/app/dashboard/course/[courseSlug]/onboarding/page.tsx`

```typescript
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getCourseWithModules, getCourseConfidenceResponses } from '@/lib/data';
import { OnboardingFormWrapper } from '@/components/dashboard/course-form-wrappers';

export default async function CourseOnboardingPage({
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
  if (!course.confidence_form) redirect(`/dashboard/course/${courseSlug}`);

  const responses = user?.id
    ? await getCourseConfidenceResponses(user.id, course.id)
    : null;

  const alreadySubmitted = responses?.onboarding !== null && responses?.onboarding !== undefined;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-6">
          <a href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
            {course.title}
          </a>
          <span>/</span>
          <span className="text-foreground/70">Pre-Course Survey</span>
        </nav>

        {alreadySubmitted ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Already submitted</p>
            <p className="text-xs text-muted-foreground mt-1">You already completed the pre-course survey.</p>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to complete the survey.</p>
          </div>
        ) : (
          <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
        )}
      </div>
    </div>
  );
}
```

---

### Step 3: Create completion page

Create file: `app/src/app/dashboard/course/[courseSlug]/completion/page.tsx`

```typescript
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getCourseWithModules, getCourseConfidenceResponses } from '@/lib/data';
import { CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';

export default async function CourseCompletionPage({
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
  if (!course.confidence_form) redirect(`/dashboard/course/${courseSlug}`);

  const responses = user?.id
    ? await getCourseConfidenceResponses(user.id, course.id)
    : null;

  const alreadySubmitted = responses?.completion !== null && responses?.completion !== undefined;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-6">
          <a href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
            {course.title}
          </a>
          <span>/</span>
          <span className="text-foreground/70">Post-Course Survey</span>
        </nav>

        {alreadySubmitted ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Already submitted</p>
            <p className="text-xs text-muted-foreground mt-1">You already completed the post-course survey.</p>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to complete the survey.</p>
          </div>
        ) : (
          <CompletionFormWrapper courseId={course.id} form={course.confidence_form} />
        )}
      </div>
    </div>
  );
}
```

---

### Step 4: Add survey links to course overview page

File: `app/src/app/dashboard/course/[courseSlug]/page.tsx`

After the `{/* ─── Course intro ─── */}` block and before `{/* ─── Progress + CTA ─── */}`, add a small "Surveys" row when `course.confidence_form` exists (for discoverability from the overview page too):

Find:
```typescript
        {/* ─── Progress + CTA / Onboarding form / Completion form ── */}
```

Insert before it:
```typescript
        {/* ─── Survey links ─────────────────────────────────────── */}
        {user && course.confidence_form && (
          <div className="flex gap-3">
            <a
              href={`/dashboard/course/${courseSlug}/onboarding`}
              className="flex-1 text-center text-xs font-mono py-2 rounded-lg border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {onboardingSubmitted ? '✓ Pre-course survey' : 'Pre-course survey'}
            </a>
            <a
              href={`/dashboard/course/${courseSlug}/completion`}
              className="flex-1 text-center text-xs font-mono py-2 rounded-lg border border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {completionSubmitted ? '✓ Post-course survey' : 'Post-course survey'}
            </a>
          </div>
        )}
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
git add app/src/components/shared/app-sidebar.tsx \
        'app/src/app/dashboard/course/[courseSlug]/onboarding/page.tsx' \
        'app/src/app/dashboard/course/[courseSlug]/completion/page.tsx' \
        'app/src/app/dashboard/course/[courseSlug]/page.tsx'
git commit -m "feat: dedicated course survey pages + fix sidebar course-name link + remove Dashboard back-link"
```
