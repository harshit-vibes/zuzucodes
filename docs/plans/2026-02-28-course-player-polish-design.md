# Design: Course Player Polish — Content Cleanup, Heights, Skeleton Loaders

**Date:** 2026-02-28
**Status:** Approved

---

## Summary

Three areas of polish now that `CoursePlayerShell` is in place:

1. **Content cleanup** — Remove inner breadcrumbs and eyebrow labels from 5 pages; shell header is the single context anchor. Keep h1s (Approach B).
2. **Height alignment** — Sidebar header and footer heights match the shell's `h-14` / `h-12`. Shell header icons sized consistently.
3. **Skeleton loaders** — Update existing `loading.tsx` files to mirror the CoursePlayerShell chrome layout.

---

## Section 1: Content Cleanup

### Approach B

Shell header already shows: `eyebrow / title`. Inner pages were written before the shell existed and duplicate this context. Remove the redundant layers; keep the h1 as a visual anchor for the page body.

### Pages and what to remove

| Page | Remove | Keep |
|------|--------|------|
| `[courseSlug]/page.tsx` (course welcome) | Tag badge (eyebrow chip) | `<h1>{course.title}</h1>` + description |
| `[courseSlug]/graduation/page.tsx` | Breadcrumb nav + "Graduation" eyebrow label | `<h1>{course.title}</h1>` |
| `[courseSlug]/certificate/page.tsx` | Breadcrumb nav + "Certificate" eyebrow label | `<h1>{course.title}</h1>` |
| `[courseSlug]/[moduleSlug]/page.tsx` (module intro) | Breadcrumb nav + "Module 01" eyebrow label | `<h1>{mod.title}</h1>` + description |
| `[courseSlug]/[moduleSlug]/quiz/page.tsx` | Module badge chip (eyebrow chip) | `<h1>{quizForm.title}</h1>` + question count / passing score meta |

### Already clean (no changes)
- Module outro, lesson intro, lesson outro — no inner eyebrow/breadcrumb to remove.

---

## Section 2: Height Alignment

### Sidebar header
- **Current**: no explicit height, uses `py-3` padding only
- **Change**: add `h-14` → `shrink-0 h-14 flex items-center ...`

### Sidebar footer
- **Current**: `h-11` (44px)
- **Change**: `h-12` (48px) — matches shell footer

### Shell header icons
- `SidebarTrigger` is already `w-7 h-7`
- `ThemeToggle` button: ensure `h-8 w-8` (currently may rely on default padding)
- `UserButton` button: ensure `h-8 w-8`
- File: `app/src/components/course/course-player-shell.tsx` — update the icon container div

---

## Section 3: Skeleton Loaders

All three existing `loading.tsx` files under course routes need updating to reflect the `CoursePlayerShell` chrome (fixed `h-14` header + scrollable content + fixed `h-12` footer).

### Shared skeleton structure

Every course player `loading.tsx` wraps content in:

```tsx
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
  {/* Shell header skeleton */}
  <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
    <Skeleton className="w-7 h-7 rounded" />
    <div className="w-px h-5 bg-border/50 shrink-0" />
    <Skeleton className="h-3 w-24 rounded" />   {/* eyebrow */}
    <Skeleton className="h-4 w-40 rounded" />   {/* title */}
    <div className="flex-1" />
    <Skeleton className="w-8 h-8 rounded" />    {/* theme toggle */}
    <Skeleton className="w-8 h-8 rounded-full" /> {/* user button */}
  </div>

  {/* Content skeleton — varies per page */}
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* page-specific content skeleton */}
  </div>

  {/* Shell footer skeleton */}
  <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
    <Skeleton className="h-3 w-20 rounded" />  {/* prev */}
    <Skeleton className="h-3 w-20 rounded" />  {/* next */}
  </div>
</div>
```

### Per-file content skeletons

**`[courseSlug]/loading.tsx`** — course welcome skeleton:
- h1 skeleton (wide, `h-6 w-64`)
- description line (`h-3 w-80`)
- progress card skeleton (`h-20 rounded-xl`)
- outcomes list (3× `h-3 w-48`)

**`[moduleSlug]/quiz/loading.tsx`** — quiz skeleton:
- h1 skeleton (`h-6 w-48`)
- meta line (`h-3 w-32`) — question count / passing score
- 4 answer option skeletons (`h-12 rounded-lg` each)
- submit button skeleton

**`[order]/loading.tsx`** — lesson content skeleton (complete rewrite):
- Split-pane layout (md: 48% / 52%)
- Left pane: prose lines (5× `h-3` varying widths)
- Right pane: editor chrome skeleton (top bar + code lines)

---

## Files Changed

| File | Action |
|------|--------|
| `app/src/components/shared/app-sidebar.tsx` | Update `SidebarHeader` to `h-14`, `SidebarFooter` to `h-12` |
| `app/src/components/course/course-player-shell.tsx` | Ensure ThemeToggle/UserButton wrappers are `h-8 w-8` |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | Remove tag badge |
| `app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx` | Remove breadcrumb + eyebrow label |
| `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx` | Remove breadcrumb + eyebrow label |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx` | Remove breadcrumb + eyebrow label |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx` | Remove module badge chip |
| `app/src/app/dashboard/course/[courseSlug]/loading.tsx` | Rewrite with shell skeleton |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/loading.tsx` | Rewrite with shell skeleton |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/loading.tsx` | Complete rewrite with shell skeleton + split pane |
