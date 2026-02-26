# Sidebar + Seed + Nav Design

## Overview

Three parallel improvements:
1. Seed data expanded to 2 modules
2. Lesson intro screen gets both prev and next navigation
3. Course player sidebar visual hierarchy improvements (Option B)

---

## Section 1: Seed Data — 2 Modules

**File:** `app/scripts/seed-content.ts`

**Module 1 (existing):** `hello-world` — 3 lessons (print, variables, input) + quiz. No changes.

**Module 2 (new):** `control-flow` — 3 lessons + quiz.

- Lesson 1: if/else — write a function that returns "positive", "negative", or "zero"
- Lesson 2: while loop — write a function that counts down from n to 0
- Lesson 3: for loop — write a function that sums a list

Each module 2 lesson needs:
- `code_template`, `solution_code`, `entry_point`
- `test_cases` (3–4 per lesson, mix of visible/hidden)
- `intro_content` (`lesson-intro` template: hook, outcomes, estimated_minutes)
- `outro_content` (`lesson-outro` template: recap, next_lesson_teaser)
- `lesson_sections` (1–2 sections per lesson: `prose-section` or `code-section` template)
- `problem_summary`, `problem_constraints`, `problem_hints`

Module 2 itself needs:
- `intro_content` (`module-intro` template)
- `outro_content` (`module-outro` template)
- `quiz_form` (3 questions, passingScore 70)

Course `intro_content` and `outro_content` stay unchanged.

---

## Section 2: Lesson Intro — Both Prev and Next

### Files
- `app/src/components/lesson/lesson-overlay.tsx`
- `app/src/components/lesson/code-lesson-layout.tsx`

### Change to `lesson-overlay.tsx`

Add `hasNext: boolean` to `LessonOverlayProps`.

On the **intro view**, show next link (top-right) when `hasNext`:

```tsx
// Top-right slot — intro view
{view === 'intro' && hasNext ? (
  <Link href={nextHref} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors">
    next
    <svg ...right-arrow... />
  </Link>
) : view === 'outro' ? (
  <Link href={nextHref} ...>next →</Link>
) : null}
```

The outro view next link is unchanged.

### Change to `code-lesson-layout.tsx`

`hasNext` is already computed (`const hasNext = position < lessonCount`). Pass it to `LessonOverlay`:

```tsx
<LessonOverlay
  ...
  hasNext={hasNext}   // ← add this
/>
```

---

## Section 3: Sidebar — Better Visual Hierarchy (Option B)

### File
- `app/src/components/shared/app-sidebar.tsx`

### Changes to `ModuleSection`

1. **Module header becomes a link** to `/dashboard/course/${courseSlug}/${module.slug}`
2. **Font weight upgrade**: `font-semibold` (was `font-medium`), always `text-foreground`
3. **Active module tinted container**: when `activeModuleSlug === module.slug`, wrap the entire section in `rounded-lg bg-primary/5 ring-1 ring-primary/10`
4. **Module section spacing**: `space-y-3` between modules (was `space-y-0.5`)

`ModuleSection` receives `isActiveModule: boolean` prop (true when `activeModuleSlug === module.slug`).

```tsx
// Wrapper div — conditional tint
<div className={isActiveModule ? 'rounded-lg bg-primary/5 ring-1 ring-primary/10 px-1 py-1' : ''}>
  {/* Module header — now a Link */}
  <Link href={`/dashboard/course/${courseSlug}/${module.slug}`} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors group">
    <span className="text-xs font-semibold text-foreground truncate flex-1">
      {module.title}
    </span>
    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
      {completedCount}/{totalCount}
    </span>
  </Link>
  {/* Lesson list — unchanged */}
  ...
</div>
```

---

## Files Affected

| File | Change |
|------|--------|
| `app/scripts/seed-content.ts` | Add module 2 with 3 lessons, quiz, intro/outro |
| `app/src/components/lesson/lesson-overlay.tsx` | Add `hasNext` prop, show next link on intro view |
| `app/src/components/lesson/code-lesson-layout.tsx` | Pass `hasNext` to `LessonOverlay` |
| `app/src/components/shared/app-sidebar.tsx` | Module header → link, font-semibold, active tint, spacing |
