# Design: Course Player Routing Redesign

**Date:** 2026-02-27
**Status:** Approved

---

## Summary

Standardise the course player with explicit URL-per-state routing (Approach A), a shared `CoursePlayerShell` component that wraps every page with a consistent header and footer, and three new pages for lesson intro, lesson outro, and module outro.

---

## Route Structure

### Full route map

```
/course/[slug]                                  ← course welcome (existing)
/course/[slug]/graduation                       ← course outro + deboarding (existing)
/course/[slug]/certificate                      ← certificate (existing)

/course/[slug]/[mod]                            ← module intro (existing, simplified)
/course/[slug]/[mod]/outro                      ← module outro (NEW)
/course/[slug]/[mod]/quiz                       ← module quiz (existing)

/course/[slug]/[mod]/lesson/[order]/intro       ← lesson intro (NEW)
/course/[slug]/[mod]/lesson/[order]             ← lesson content / code editor (existing)
/course/[slug]/[mod]/lesson/[order]/outro       ← lesson outro (NEW)
```

### Linear navigation sequence

```
Course Welcome
  → Module 1 intro
    → Lesson 1 intro → Lesson 1 content → Lesson 1 outro
    → Lesson 2 intro → Lesson 2 content → Lesson 2 outro
    → ...
    → Quiz (if module has quiz_form)
  → Module 1 outro
  → Module 2 intro
    → ...
  → Graduation
  → Certificate
```

---

## Redirect Guards

Server-side redirects enforced before rendering:

| Page | Condition | Redirects to |
|------|-----------|--------------|
| `lesson/[order]/outro` | `passed_at IS NULL` | `lesson/[order]` |
| `[mod]/outro` | module not fully completed | `[mod]` |
| `certificate` | completion form not submitted | `graduation` |
| `lesson/[order]/intro` | none — always viewable | — |
| `lesson/[order]` | none — CodeLessonLayout handles null user_code | — |
| `[mod]` | none — always viewable | — |

**Onboarding gate (already implemented, unchanged):** module intro, lesson intro, lesson content, lesson outro, quiz — all redirect to course welcome if `onboarding === null` and `course.confidence_form` exists.

---

## Next Button Gate Rules

| Current page | Next unlocked when | Next destination |
|---|---|---|
| Course Welcome | onboarding form submitted | Module 1 intro |
| Module intro | always unlocked | Lesson 1 intro |
| Lesson intro | always unlocked | Lesson content |
| Lesson content | `passed_at IS NOT NULL` | Lesson outro |
| Lesson outro | always unlocked | Next lesson intro or Quiz |
| Quiz | quiz passed | Module outro |
| Module outro | always unlocked | Next module intro or Graduation |
| Graduation | completion form submitted | Certificate |
| Certificate | no Next (end of sequence) | — |

---

## Shared `CoursePlayerShell` Component

**File:** `app/src/components/course/course-player-shell.tsx`

Every page renders this wrapper. Provides a fixed header and fixed footer with scrollable content between them.

```
┌─────────────────────────────────────────────────────┐
│  MODULE 2 · LESSON 3                    [eyebrow]   │  ← ~44px fixed
│  Loops and Conditions                   [H1]        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [children — scrollable]                             │
│                                                      │
├─────────────────────────────────────────────────────┤
│  ← Variables           [locked🔒] Conditionals →   │  ← ~52px fixed
└─────────────────────────────────────────────────────┘
```

### Props

```ts
interface CoursePlayerShellProps {
  eyebrow: string          // "MODULE 2 · LESSON 3", "CERTIFICATE", etc.
  title: string            // entity title shown as H1
  prevHref: string | null  // null = no Prev (first page)
  prevLabel: string | null
  nextHref: string | null  // null = no Next (last page)
  nextLabel: string | null
  nextLocked: boolean      // greys out Next with lock icon
  children: React.ReactNode
}
```

### Eyebrow text per page

| Page | Eyebrow |
|------|---------|
| Course Welcome | `course.tag ?? "COURSE"` (uppercase mono) |
| Module intro / outro | `"MODULE 01"` (zero-padded) |
| Lesson intro / content / outro | `"MODULE 01 · LESSON 3"` |
| Quiz | `"MODULE 01 · QUIZ"` |
| Graduation | `"GRADUATION"` |
| Certificate | `"CERTIFICATE"` |

---

## `buildCourseSequence` Utility

**File:** `app/src/lib/course-sequence.ts`

Builds the ordered array of steps for prev/next computation. Called server-side in each page; `React.cache()` on data fetches means no extra DB queries.

```ts
type CourseStep = {
  href: string
  label: string
  type: 'course-intro' | 'module-intro' | 'lesson-intro' | 'lesson-content'
       | 'lesson-outro' | 'quiz' | 'module-outro' | 'graduation' | 'certificate'
}

function buildCourseSequence(
  courseSlug: string,
  modules: Module[],
  lessonsByModule: Record<string, Lesson[]>
): CourseStep[]
```

Each page finds its own index in the sequence and reads `steps[i-1]` (prev) and `steps[i+1]` (next).

---

## New Pages Content

### `/lesson/[order]/intro`

Surfaces the problem statement as a calm pre-reading page before the code challenge.

Renders:
- `lesson.problem_summary` — problem description
- `lesson.problem_constraints[]` — constraints list
- `lesson.problem_hints[]` — hints (collapsible)
- **"Begin"** button → navigates to `/lesson/[order]` (no API call needed)

### `/lesson/[order]/outro`

Wrap-up after passing the challenge.

Renders:
- `lesson.outro_content` (new column) via `TemplateRenderer` if present
- Fallback: simple "Challenge complete ✓" confirmation with lesson title

### `/[mod]/outro`

Module completion page. Content currently lives conditionally on the module intro page — moves here.

Renders:
- `mod.outro_content` via `TemplateRenderer` if present
- Fallback: simple "Module complete ✓" confirmation with module title
- Guard: redirect to `[mod]` if module not fully completed

---

## DB Change

**One new column:**

```sql
ALTER TABLE lessons ADD COLUMN outro_content TEXT;
```

No other schema changes. `problem_summary`, `problem_constraints`, `problem_hints`, and `modules.outro_content` all already exist.

---

## Existing Pages Updated

| File | Change |
|------|--------|
| `[courseSlug]/page.tsx` | Wrap with `CoursePlayerShell`; remove breadcrumb; add prev/next |
| `[courseSlug]/graduation/page.tsx` | Wrap with `CoursePlayerShell`; add prev/next |
| `[courseSlug]/certificate/page.tsx` | Wrap with `CoursePlayerShell`; add prev/next |
| `[courseSlug]/[moduleSlug]/page.tsx` | Wrap with shell; remove `outro_content` block; remove contextual CTA button |
| `[courseSlug]/[moduleSlug]/quiz/page.tsx` | Wrap with `CoursePlayerShell`; add prev/next |
| `[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx` | Wrap with shell; replace existing header; add footer |
| `app/src/components/shared/app-sidebar.tsx` | Extend `parseDashboardPath` to handle `/intro` and `/outro` suffixes |

---

## Files Changed

| File | Action |
|------|--------|
| `app/migrations/NNNN_add_lesson_outro_content.sql` | New migration |
| `app/src/lib/course-sequence.ts` | New utility |
| `app/src/components/course/course-player-shell.tsx` | New component |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/outro/page.tsx` | New page |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/intro/page.tsx` | New page |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/outro/page.tsx` | New page |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | Updated |
| `app/src/app/dashboard/course/[courseSlug]/graduation/page.tsx` | Updated |
| `app/src/app/dashboard/course/[courseSlug]/certificate/page.tsx` | Updated |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx` | Updated |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx` | Updated |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx` | Updated |
| `app/src/components/shared/app-sidebar.tsx` | Updated |
