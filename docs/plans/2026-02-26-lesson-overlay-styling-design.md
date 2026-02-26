# Lesson Overlay + Pane Styling Redesign — Design Document

## Overview

Three parallel improvements to the lesson experience:
1. Lesson intro/outro become full-width blocking overlays — the lesson state machine has three views: `intro → content → outro`
2. Theory pane sections and practical pane get a visual refresh
3. Module and course intro/outro pages get improved treatment

---

## Section 1: Lesson Intro/Outro Blocking Overlay

### State Machine

`CodeLessonLayout` gets a `view` state: `'intro' | 'content' | 'outro'`. Initial state is always `'intro'`. When `view !== 'content'`, a full-width overlay covers both panes. The header stays visible throughout.

### Intro Screen

- Full-width overlay over both panes (absolute inset, bg-background)
- Centered content card (~600px max-width)
- Top: lesson position label (`LESSON N OF M` in mono)
- Middle: `LessonIntroTemplate` content (hook, outcomes, estimated time)
- Bottom: `[ Begin → ]` primary button → sets `view = 'content'`
- Top-left: `← prev` link — navigates to previous lesson (disabled/hidden on lesson 1)

### Outro Screen

- Same full-width overlay treatment
- Top-right: `next →` link — navigates to next lesson's intro (or quiz if last)
- Middle: `LessonOutroTemplate` content (recap, next_lesson_teaser)
- Bottom: `[ ← Back to lesson ]` ghost button → sets `view = 'content'`

### Navigation Changes

- **Footer nav removed entirely** — replaced by intro/outro screen navigation
- Prev on intro → `router.push` to previous lesson URL (lands on that lesson's intro state)
- Next on outro → `router.push` to next lesson URL, or quiz URL if at module end
- Lesson 1 prev → disabled (or links to module overview page)

### Transition

150ms CSS opacity fade between `intro/outro` and `content` views. No external animation library needed.

---

## Section 2: Theory Pane Styling

### Section Dividers (`lesson-sections.tsx`)

Replace the faint label + `h-px` line with a numbered mono badge:
```
[01]  ────────────────
```
- Badge: `font-mono text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground/50`
- Line: `flex-1 h-px bg-border/20`

### prose-section template

- Add `max-w-prose` and explicit `leading-relaxed` to the markdown container
- Tighten `prose-container` spacing

### code-section template

- Add `border-l-2 border-primary/20 pl-4` to the explanation text (mirrors lesson-intro hook style)
- Takeaway box: swap to `ring-1 ring-primary/20 bg-primary/5` (lighter, less filled)

### lesson-intro template

- Swap `CheckCircle2` outcome icons for plain mono counters `01` `02` `03` — more editorial
- Keep `border-l-2 border-primary/40 pl-4` hook style
- `estimated_minutes` clock line: keep as-is

### lesson-outro template

- "Up next" box: change `bg-muted/30` to `bg-primary/5 border-primary/20` — warmer, forward-momentum signal
- Add a subtle `text-primary/60` color to the "Up next" label

---

## Section 3: Practical Pane Styling (ProblemPanel)

### Summary

- Add `CHALLENGE` label above summary text in same mono style as section badges
- Bump summary font to `text-sm font-medium` (currently plain `text-sm`)

### Examples

- Each example row: add `border-l-2 border-primary/30` left accent
- Background: `dark:bg-zinc-900` (slightly darker than current `dark:bg-zinc-800/60`)

### Constraints

- Replace `bg-muted/40` pills with `ring-1 ring-border/40 bg-transparent` — lighter, less filled

### Hints

- Each revealed hint: prefix with `hint {i+1}:` in `font-mono text-[10px] text-muted-foreground/40` above the hint text

---

## Section 4: Module Intro/Outro Page

**File:** `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`

Currently the intro/outro are rendered inside a plain card conditionally. Improvements:

- Intro card: full-width, more prominent — `border-primary/20 bg-primary/5` tint when module not started
- Outro card: success tint — `border-success/20 bg-success/5` when module completed
- Both cards: increase internal padding, add section label (`IN THIS MODULE` / `MODULE COMPLETE`) in mono above the template content

---

## Section 5: Course Intro/Outro Page

**File:** `app/src/app/dashboard/course/[courseSlug]/page.tsx`

Currently `course-intro` template renders inline in the header div alongside the title.

- Separate it into its own card block below the title, above the progress/CTA section
- `border-border/30 bg-card rounded-xl p-5` card container
- `course-outro`: add similar card treatment when course is complete (currently no outro is shown)
- Add course outro rendering: if `course.outro_content && isCompleted`, render `<TemplateRenderer name="course-outro" content={course.outro_content} />` in a card below progress

---

## Files Affected

| File | Change |
|------|--------|
| `app/src/components/lesson/code-lesson-layout.tsx` | Add `view` state, overlay component, remove footer nav |
| `app/src/components/lesson/lesson-sections.tsx` | Remove intro/outro rendering (moved to overlay) |
| `app/src/components/templates/lesson-intro.tsx` | Swap CheckCircle2 for mono counters |
| `app/src/components/templates/lesson-outro.tsx` | Warm up "up next" box colors |
| `app/src/components/templates/prose-section.tsx` | Add max-w-prose |
| `app/src/components/templates/code-section.tsx` | Border-left on explanation, lighter takeaway box |
| `app/src/components/lesson/problem-panel.tsx` | CHALLENGE label, example left-border, lighter constraint pills, hint prefix |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx` | Colored intro/outro cards |
| `app/src/app/dashboard/course/[courseSlug]/page.tsx` | course-intro as separate card, course-outro on completion |
