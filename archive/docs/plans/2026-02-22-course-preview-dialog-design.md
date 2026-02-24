# Course Preview Dialog — Visual & Content Redesign

**Date:** 2026-02-22
**Approach:** B — Premium Header + Redesigned Module List

---

## Goal

Improve the `CourseOverviewDialog` with better visual polish and richer information depth, using data already available in the DB.

---

## Changes

### 1. `/api/courses/[courseId]/detail/route.ts`

Extend `ModuleDetail` response type with two new fields:

```typescript
interface ModuleDetail {
  // existing
  id: string;
  title: string;
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
  // NEW
  description: string | null;       // from module.description
  lessonTitles: string[];           // getMdxSectionTitles(module.mdx_content)
}
```

Both fields are derivable in-memory from data already loaded by `getCourseWithModules`.

---

### 2. `course-overview-dialog.tsx`

#### Dialog shell
- Width: `max-w-md` → `max-w-lg`
- Height: `max-h-[85vh]` → `max-h-[88vh]`

#### Header (no new data fetch)
```
[tag chip]
Course Title                                  [×]
Short description (1-2 lines muted)
▓▓▓▓▓▓▓░░░░ 62%   [In Progress]
```
- Course tag rendered as a primary-tinted pill above the title (only if `course.tag` exists)
- Status badge inline with progress bar: primary/10 bg for `in_progress`, muted for `completed`, hidden for `not_started`

#### "What you'll learn" section
- Rendered only if `course.outcomes?.length > 0`
- Section label: "What you'll learn" in small-caps / label-mono style
- 2-column grid when ≥4 outcomes; single column otherwise
- Each item: small primary check icon + outcome text (`text-sm`)

#### Module list (curriculum)
- Each module in a subtle rounded card (`rounded-lg border border-border/50 bg-card/50 p-3`)
- Module header row:
  - Title (`text-sm font-medium`) on the left
  - Completion fraction + mini inline progress bar on the right (`2/4 ▓▓░░`)
- Module description in `text-xs text-muted-foreground` below title (if set)
- Lesson rows:
  - Real lesson title from `lessonTitles[i]` (fallback: `Lesson ${i+1}`)
  - Completion icon: filled circle + check (done) vs. empty circle (pending)
  - `text-xs`, foreground when done, muted when pending
- Quiz row: same treatment but with "Quiz" label
- "Done" module badge: `bg-primary/15 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full` (replace plain text)

#### Footer CTA
Unchanged — Start / Continue / Review button.

---

## Files Changed

| File | Change |
|------|--------|
| `app/src/app/api/courses/[courseId]/detail/route.ts` | Add `description` + `lessonTitles` to response |
| `app/src/components/dashboard/course-overview-dialog.tsx` | Full visual redesign |

---

## What Does NOT Change

- API auth logic
- `getCourseWithModules` / `getSectionCompletionStatus` calls
- `CourseGrid` — no changes to how the dialog is triggered
- CTA navigation logic
- Skeleton loading state structure (may update count/shape)
