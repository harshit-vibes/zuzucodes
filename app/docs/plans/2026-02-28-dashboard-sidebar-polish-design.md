# Dashboard + Sidebar Polish Design

> Date: 2026-02-28

## Goal

Make the dashboard action-oriented (a clear "what to do next" signal) and simplify the sidebar (remove stats grid, formalize a utility-pages section for standalone pages like Roadmap).

## Approved Approach

**Approach A — "Today's Focus" card + sidebar cleanup.**

---

## Section 1: Sidebar

Remove the 2×2 stats grid from dashboard mode entirely. The dashboard sidebar becomes:

```
[Logo → /dashboard]
─────────────────────────   border-b separator
Dashboard
─────────────────────────   border-b separator
Roadmap                     ← utility section starts here
[future standalone pages]
─────────────────────────
[UserCard footer]
```

- No section label — just a thin `border-b` divider between primary nav and utility pages.
- Adding a new standalone page = one `SidebarMenuItem` in the utility block.
- Course mode sidebar is unchanged.

**Files:**
- Modify: `src/components/shared/app-sidebar.tsx` — remove `SidebarStats` component and its render call; add a `border-b` separator between Dashboard/Roadmap items.

---

## Section 2: Dashboard "Today's Focus" Card

The hero section becomes **greeting + streak badge only** — the embedded resume card is removed from the hero.

Below the hero (and above the track rows), render a full-width **"Today's Focus"** card — the single most important next action, computed server-side.

### States

| State | Headline | Subtext | CTA label |
|-------|----------|---------|-----------|
| No progress (courses exist) | "Start your journey" | First course title | "Begin Lesson 1 →" |
| In-progress lesson | "Pick up where you left off" | Module · Lesson title | "Continue →" |
| All lessons done in active module, quiz pending | "Time to test yourself" | Module name | "Take the quiz →" |
| Module complete, next module available | "You're on a roll" | Next module title | "Start Module →" |
| Course complete, next course available | "Ready for the next challenge" | Next course title | "Start Course →" |
| Everything complete | "You've finished everything 🎉" | "More content coming soon" | — |
| Unauthenticated | — | (hidden — existing `UnauthenticatedCTA` renders instead) | — |

### Visual design

- Full-width card with a left primary-color accent bar.
- Left: icon (Play / Trophy / ArrowRight depending on state) in a rounded tile.
- Center: headline (semibold, sm) + subtext (xs, muted).
- Right: primary CTA button (sm).
- Placed between the hero border and the first track row.

**Files:**
- Modify: `src/app/dashboard/page.tsx` — remove resume card from `HeroSection`; add `TodaysFocusCard` component; call `getNextAction()`.

---

## Section 3: Data Layer

New pure-computation function `getNextAction()` in `src/lib/data.ts`. No new DB schema.

### Inputs (all already fetched on the dashboard)

- `userId: string`
- `courses: Course[]`
- `courseProgress: Record<string, CourseProgress>`
- `resumeData: ResumeData | null` — already fetched via `getResumeData()`

### One new DB call

`getSectionCompletionStatus(userId, modules)` — already exists in `data.ts`. Called for the **active course's modules only** (the course being resumed, or first in-progress course). One query, not N.

### Logic

```
if no userId → return null
if no courseProgress or all 'not_started' → return { type: 'start', course: courses[0] }
find activeCourse = first course with status === 'in_progress'
  if none → find first 'not_started' course → return { type: 'start', course }
  if none → return { type: 'all_done' }

fetch sectionCompletion for activeCourse modules
find activeModule = first module where not all lessons completed
  if found:
    find nextLesson = first incomplete lesson in activeModule → return { type: 'lesson', ... }
    if all lessons done but quiz not done → return { type: 'quiz', module: activeModule }
  if no incomplete module:
    find nextCourse = next 'not_started' course → return { type: 'next_course', course }
    else → return { type: 'all_done' }
```

### Return type

```typescript
type NextAction =
  | { type: 'start';        course: Course;  href: string }
  | { type: 'lesson';       course: Course;  module: Module; lessonTitle: string; href: string }
  | { type: 'quiz';         course: Course;  module: Module; href: string }
  | { type: 'next_module';  course: Course;  module: Module; href: string }
  | { type: 'next_course';  course: Course;  href: string }
  | { type: 'all_done' }
  | null
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/components/shared/app-sidebar.tsx` | Remove `SidebarStats` component + render; add separator between Dashboard and Roadmap nav items |
| `src/lib/data.ts` | Add `NextAction` type + `getNextAction()` function |
| `src/app/dashboard/page.tsx` | Remove resume card from `HeroSection`; add `TodaysFocusCard` component + call `getNextAction()` |

No migrations. No new tables. No new API routes.
