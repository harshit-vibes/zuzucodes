# UI Updates: Template Components, Module Page, Course Page

## Goal

Wire the new template system into a cohesive warm/course-like UI across three surfaces: the lesson player's content templates, a new module overview page, and an enhanced course landing page.

## Visual Register

Warm, course-like — cards, icons, clear section hierarchy. Reference: Egghead, Frontend Masters. Not minimal/editorial. Not heavy/skeuomorphic. Clear progress signals, readable prose, checkmark-driven outcome lists.

---

## Part 1: Template Component Redesign

Seven components redesigned. `prose-section` unchanged.

### `lesson-intro`

- Hook text: larger (`text-lg`+), prominent, with a faint left accent line (`border-l-2 border-primary/40 pl-4`)
- Outcomes: checklist with solid check icons (Lucide `CheckCircle2` or inline SVG), not tiny dots
- Estimated time: small pill badge (`rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono`)

### `lesson-outro`

- Small `"✓ Lesson complete"` label at top in muted success colour
- Recap as readable body text
- "Up next": forward-pointing card — rounded border, arrow icon, teaser text inside

### `code-section`

- Explanation prose via `<Markdown>` (unchanged)
- Code block via `<Markdown>` with fenced syntax (unchanged)
- Takeaway: highlighted callout box — tinted background (`bg-primary/5 border border-primary/20 rounded-lg p-3`), small `"Key takeaway"` label above

### `module-intro`

- Title + description with clear typographic hierarchy (`text-xl font-semibold` / `text-foreground/70`)
- "In this module": 2-column checklist grid with check icons, matching lesson-intro style

### `module-outro`

- Recap body text
- "Coming up": forward card with arrow, mirrors lesson-outro "Up next" treatment

### `course-intro`

- Hook as large prominent text (`text-xl`+)
- Outcomes: 2-column checklist grid with check icons
- `who_is_this_for`: muted note at bottom (`text-sm text-muted-foreground/60`)

### `course-outro`

- Recap body text
- Certificate info (if present): distinct card with primary tint (`bg-primary/5 border border-primary/20 rounded-lg p-4`)

---

## Part 2: Module Overview Page

**Route:** `/dashboard/course/[courseId]/[moduleId]`

Single page with three visual modes based on user progress. No separate URLs for "start" vs "complete" states — the page adapts.

### Data requirements

- `getModule(moduleId)` updated to SELECT `intro_content`, `outro_content`
- `Module` type updated: `intro_content: unknown | null`, `outro_content: unknown | null`
- `getLessonsForCourse([moduleId])` — already exists
- `getSectionCompletionStatus(userId, [module])` — already exists

### Page structure

**Header (always)**
- Breadcrumb: Course title → Module title
- Module number + title (`01 — Hello, World!`)
- Lesson count + quiz indicator

**Content block (conditional on progress)**

| State | Content shown |
|-------|--------------|
| Not started (`completedItems === 0`) | `module-intro` template rendered (if `intro_content` present), else description text |
| In progress (`0 < completedItems < total`) | No content block — straight to lesson list |
| Completed (`completedItems === total`) | `module-outro` template rendered (if `outro_content` present), else plain recap |

**Lesson list (always)**
- Each lesson row: completion dot + title + link to `/lesson/[order]`
- Quiz row (if `quiz_form`): quiz icon + "Quiz" + link to `/quiz`
- Rows show completion state

**CTA button (always)**

| State | Label | Destination |
|-------|-------|-------------|
| Not started | Start Module | First lesson |
| In progress | Continue | First incomplete lesson/quiz |
| Completed | Next Module | Next module page (or Back to Course if last) |

---

## Part 3: Course Page Enhancement

**Route:** `/dashboard/course/[courseId]` (existing, enhanced)

### Data requirements

- `Course` type updated: `intro_content: unknown | null`, `outro_content: unknown | null`
- `getCourseWithModules()` updated to SELECT `intro_content`, `outro_content` from courses

### Changes

**Hero section**
- If `course.intro_content` is present: render using `CourseIntroTemplate` instead of the current description paragraph
- If null: fall back to existing `course.description` text (no regression)
- The `outcomes` block below the hero stays (driven by `course.outcomes[]` from the courses table — this is a separate field from `course-intro.outcomes`)

**Curriculum module headers**
- Module title becomes a `<Link>` to `/dashboard/course/[courseId]/[moduleId]`
- Add a hover chevron (already present as SVG in lesson rows — reuse the pattern)
- No other changes to the curriculum section

---

## Navigation Flow

```
/dashboard
  └── /dashboard/course/[courseId]          ← enhanced course landing
        └── /dashboard/course/[courseId]/[moduleId]     ← new module overview
              └── /dashboard/course/[courseId]/[moduleId]/lesson/[order]   ← lesson player
              └── /dashboard/course/[courseId]/[moduleId]/quiz             ← quiz
```

The lesson player footer already has previous/next lesson navigation. The module page sits one level above and is reachable from:
1. Course curriculum (module header link)
2. Sidebar module links (unchanged — sidebars link directly to lessons today; module page link can be added later)

---

## Out of Scope

- Seeding `intro_content`/`outro_content` for modules and courses (seed script only seeds lesson 0 intro/outro today — module/course content is LLM-generated later)
- Course outro page / completion certificate flow
- Sidebar linking to module overview pages
- Mobile layout changes beyond what Tailwind responsive classes provide naturally
