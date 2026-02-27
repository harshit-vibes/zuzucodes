# Course Player Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove redundant inner breadcrumbs and eyebrow labels from 5 course player pages (Approach B — keep h1), align sidebar heights with shell heights, and rewrite 3 loading.tsx skeleton files to match the CoursePlayerShell layout.

**Architecture:** Direct edits to existing page files and components. No new files needed. All changes are surgical removals or replacements.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, React Server Components

---

## Context

`CoursePlayerShell` provides a fixed `h-14` header with eyebrow + title and a `h-12` footer. The pages still contain inner eyebrow labels, breadcrumbs, and title h1s that duplicate the shell header.

The sidebar header is unsized (content-height, `py-3`) and footer is `h-11` — both must be updated to match the shell's `h-14` / `h-12`.

`ThemeToggle` is `h-9 w-9` (36px) but `SidebarTrigger` in the shell is `w-7 h-7` (28px). Change ThemeToggle to `h-8 w-8` (32px) for consistent icon sizing within `h-14`.

Three `loading.tsx` files have outdated layouts (breadcrumbs, old lesson sections, sticky nav) that need to be replaced with a skeleton matching the shell chrome.

---

## Task 1: Remove redundant content from 5 pages

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`

### 1a. Course welcome (`[courseSlug]/page.tsx`)

Remove the tag badge span (the eyebrow chip). Keep the h1 and description. Also check if `titleCase` is still used anywhere else in the file — if not, remove the import.

**Remove** (lines 101–105):
```tsx
{course.tag && (
  <span className="inline-block mb-3 px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-primary/10 text-primary">
    {titleCase(course.tag)}
  </span>
)}
```

The `<div>` wrapper around the h1 (line 100) and the h1 itself (lines 106–108) stay.

### 1b. Graduation (`graduation/page.tsx`)

Remove the `{/* Breadcrumb */}` nav block and the `{/* Header */}` div (eyebrow label + h1 wrapper). Keep the h1 text by pulling it out of the wrapper. Keep the rest of the page content unchanged.

**Remove** (lines 79–98):
```tsx
{/* Breadcrumb */}
<nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
  <Link href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
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
```

**Replace with** just the h1 (no wrapper div needed):
```tsx
<h1 className="text-2xl font-semibold tracking-tight text-foreground">
  {course.title}
</h1>
```

Also remove the `Link` import if it's only used in the breadcrumb — grep the file to check.

### 1c. Certificate (`certificate/page.tsx`)

Same as graduation. Remove breadcrumb nav and header div with eyebrow. Keep h1.

**Remove** (lines 82–101, the breadcrumb nav + header div):
```tsx
{/* Breadcrumb */}
<nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
  <Link href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
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
```

**Replace with:**
```tsx
<h1 className="text-2xl font-semibold tracking-tight text-foreground">
  {course.title}
</h1>
```

Also remove `Link` import if unused after this change.

### 1d. Module intro (`[moduleSlug]/page.tsx`)

Remove breadcrumb nav and header div (eyebrow + h1 wrapper). Keep h1 and description.

**Remove** (lines 113–138):
```tsx
{/* Breadcrumb */}
<nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
  <Link href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
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
  {mod.description ? (
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
      {mod.description}
    </p>
  ) : null}
</div>
```

**Replace with:**
```tsx
<div>
  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
    {mod.title}
  </h1>
  {mod.description ? (
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
      {mod.description}
    </p>
  ) : null}
</div>
```

Check if `Link` is used elsewhere in the file — if only in the breadcrumb, remove the `Link` import.

### 1e. Quiz (`[moduleSlug]/quiz/page.tsx`)

Remove the module badge chip div. Keep h1 (quiz title) and meta line (question count + passing score). The `{/* Passed */}` badge inside the chip is removed too (quiz complete state is shown by the footer Next being unlocked).

**Remove** (lines 83–92, the `inline-flex` div):
```tsx
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
```

Keep the h1 and meta `<p>` unchanged.

Also remove `min-h-screen` from the outer quiz content div (line 79: `<div className="min-h-screen pb-10">`) — replace with `<div className="pb-10">` since the shell manages height.

### Step: Verify

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

### Step: Commit

```bash
git add \
  "app/src/app/dashboard/course/[courseSlug]/page.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx"
git commit -m "feat: remove redundant breadcrumbs and eyebrow labels from course player pages"
```

---

## Task 2: Height alignment — sidebar + ThemeToggle

**Files:**
- Modify: `app/src/components/shared/app-sidebar.tsx`
- Modify: `app/src/components/shared/theme-toggle.tsx`

### 2a. Sidebar header height (`app-sidebar.tsx`)

**Current** (line 240):
```tsx
<SidebarHeader className="border-b border-border/50 px-3 py-3">
```

**Replace with:**
```tsx
<SidebarHeader className="border-b border-border/50 px-3 h-14 flex items-center">
```

This matches `CoursePlayerShell` header height exactly.

### 2b. Sidebar footer height (`app-sidebar.tsx`)

**Current** (line 393):
```tsx
<SidebarFooter className="border-t border-border/40 h-11 flex items-center justify-center px-4">
```

**Replace with:**
```tsx
<SidebarFooter className="border-t border-border/40 h-12 flex items-center justify-center px-4">
```

### 2c. ThemeToggle size (`theme-toggle.tsx`)

`ThemeToggle` uses `h-9 w-9` (36px) with a border and rounded-lg. Change to `h-8 w-8` (32px) — matches the standard icon button size within `h-14`. There are two buttons in the component (unmounted state + mounted state). Both must be updated.

**Current** (unmounted button, line 19):
```tsx
className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
```

**Replace with:**
```tsx
className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
```

**Current** (mounted button, line 30):
```tsx
className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
```

**Replace with:**
```tsx
className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
```

### Step: Verify

```bash
cd app && npx tsc --noEmit
```

### Step: Commit

```bash
git add app/src/components/shared/app-sidebar.tsx app/src/components/shared/theme-toggle.tsx
git commit -m "feat: align sidebar header/footer heights with CoursePlayerShell, resize ThemeToggle to h-8 w-8"
```

---

## Task 3: Rewrite skeleton loading files

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/loading.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/loading.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/loading.tsx`

All three get wrapped in the shared shell skeleton structure:

```tsx
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
  {/* Shell header skeleton — matches h-14 */}
  <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
    <div className="w-7 h-7 skeleton rounded shrink-0" />
    <div className="w-px h-5 bg-border/30 shrink-0" />
    <div className="h-2.5 w-20 skeleton rounded shrink-0" />
    <div className="h-3.5 w-40 skeleton rounded" />
    <div className="flex-1" />
    <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
    <div className="w-8 h-8 skeleton rounded-full shrink-0" />
  </div>

  {/* Scrollable content */}
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* page-specific skeleton */}
  </div>

  {/* Shell footer skeleton — matches h-12 */}
  <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
    <div className="h-2.5 w-16 skeleton rounded" />
    <div className="h-2.5 w-16 skeleton rounded" />
  </div>
</div>
```

### 3a. Course welcome loading (`[courseSlug]/loading.tsx`)

Replace entire file:

```tsx
export default function CourseLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Shell header skeleton */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-7 h-7 skeleton rounded shrink-0" />
        <div className="w-px h-5 bg-border/30 shrink-0" />
        <div className="h-2.5 w-16 skeleton rounded shrink-0" />
        <div className="h-3.5 w-44 skeleton rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
        <div className="w-8 h-8 skeleton rounded-full shrink-0" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          {/* h1 + description */}
          <div className="space-y-2">
            <div className="h-7 w-2/3 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-4 w-4/5 skeleton rounded" />
          </div>

          {/* Progress card */}
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-3 w-36 skeleton rounded" />
              </div>
              <div className="h-6 w-10 skeleton rounded" />
            </div>
            <div className="h-1.5 w-full skeleton rounded-full" />
            <div className="h-9 w-full skeleton rounded-lg" />
          </div>

          {/* Curriculum */}
          <div className="space-y-3">
            <div className="h-4 w-20 skeleton rounded" />
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <div className="h-4 w-48 skeleton rounded" />
                  <div className="h-3 w-8 skeleton rounded" />
                </div>
                <div className="divide-y divide-border/20">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-3.5 h-3.5 skeleton rounded-full shrink-0" />
                      <div className="h-4 flex-1 skeleton rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shell footer skeleton */}
      <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
        <div className="h-2.5 w-16 skeleton rounded" />
        <div className="h-2.5 w-16 skeleton rounded" />
      </div>
    </div>
  );
}
```

### 3b. Quiz loading (`[moduleSlug]/quiz/loading.tsx`)

Replace entire file. Remove breadcrumb and module badge chip — shell shows that context. Keep quiz title h1, meta, question cards, navigation:

```tsx
export default function QuizLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Shell header skeleton */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-7 h-7 skeleton rounded shrink-0" />
        <div className="w-px h-5 bg-border/30 shrink-0" />
        <div className="h-2.5 w-24 skeleton rounded shrink-0" />
        <div className="h-3.5 w-40 skeleton rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
        <div className="w-8 h-8 skeleton rounded-full shrink-0" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto px-6 py-10">
          {/* Quiz title + meta — centered */}
          <header className="max-w-2xl mx-auto text-center mb-10 space-y-3">
            <div className="h-7 w-64 skeleton rounded mx-auto" />
            <div className="h-4 w-48 skeleton rounded mx-auto" />
          </header>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 skeleton rounded" />
                <div className="h-3.5 w-16 skeleton rounded" />
              </div>
              <div className="h-1.5 skeleton rounded-full" />
            </div>

            {/* Question card */}
            <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8">
              <div className="space-y-2 mb-8">
                <div className="h-6 w-full skeleton rounded" />
                <div className="h-6 w-3/4 skeleton rounded" />
              </div>
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <div key={letter} className="p-4 rounded-xl border border-border/60">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
                      <div className="flex-1 py-1">
                        <div className="h-5 w-4/5 skeleton rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="h-10 w-28 skeleton rounded-lg" />
              <div className="h-10 w-24 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Shell footer skeleton */}
      <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
        <div className="h-2.5 w-16 skeleton rounded" />
        <div className="h-2.5 w-16 skeleton rounded" />
      </div>
    </div>
  );
}
```

### 3c. Lesson content loading (`[order]/loading.tsx`)

Complete rewrite. The lesson page is now a split pane (left: prose, right: code editor) inside the shell. The old sticky header, breadcrumb, article structure, and sticky bottom nav are all gone.

Replace entire file:

```tsx
export default function LessonLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Shell header skeleton */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-7 h-7 skeleton rounded shrink-0" />
        <div className="w-px h-5 bg-border/30 shrink-0" />
        <div className="h-2.5 w-28 skeleton rounded shrink-0" />
        <div className="h-3.5 w-44 skeleton rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
        <div className="w-8 h-8 skeleton rounded-full shrink-0" />
      </div>

      {/* Split pane content — mirrors CodeLessonLayout */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
        {/* Prose pane — left */}
        <div className="hidden md:flex md:w-[48%] border-r border-border/50 flex-col px-8 py-6 space-y-4 overflow-hidden">
          <div className="h-5 w-full skeleton rounded" />
          <div className="h-5 w-11/12 skeleton rounded" />
          <div className="h-5 w-4/5 skeleton rounded" />
          <div className="h-5 w-full skeleton rounded mt-2" />
          <div className="h-5 w-5/6 skeleton rounded" />
          <div className="h-6 w-40 skeleton rounded mt-4" />
          <div className="h-5 w-full skeleton rounded" />
          <div className="h-5 w-3/4 skeleton rounded" />
        </div>

        {/* Code pane — right */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-border bg-muted/50">
            <div className="h-2.5 w-10 skeleton rounded" />
            <div className="h-6 w-10 skeleton rounded" />
          </div>
          {/* Code lines */}
          <div className="flex-1 bg-background p-4 space-y-2 overflow-hidden">
            <div className="h-4 w-1/2 skeleton rounded" />
            <div className="h-4 w-3/4 skeleton rounded" />
            <div className="h-4 w-2/5 skeleton rounded" />
            <div className="h-4 w-5/6 skeleton rounded" />
            <div className="h-4 w-1/3 skeleton rounded" />
            <div className="h-4 w-2/3 skeleton rounded" />
          </div>
        </div>
      </div>

      {/* Shell footer skeleton */}
      <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
        <div className="h-2.5 w-16 skeleton rounded" />
        <div className="h-2.5 w-16 skeleton rounded" />
      </div>
    </div>
  );
}
```

### Step: Verify

```bash
cd app && npx tsc --noEmit
```

### Step: Commit

```bash
git add \
  "app/src/app/dashboard/course/[courseSlug]/loading.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/loading.tsx" \
  "app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/loading.tsx"
git commit -m "feat: rewrite skeleton loaders to match CoursePlayerShell layout"
```

---

## Task 4: Final type check

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors. No build needed — all changes are UI-only.
