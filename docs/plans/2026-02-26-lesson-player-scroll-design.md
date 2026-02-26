# Lesson Player: Continuous Scroll Design

**Date:** 2026-02-26

**Goal:** Remove the paginated section-by-section navigation from the lesson player's left pane, replacing it with a single continuous scroll.

**Problem:** Two navigation systems coexist in the lesson player — section-level (up/down arrows + dots) and lesson-level (footer prev/next). The section pagination also forces learners to click through intro → sections → outro before reaching the coding challenge, adding unnecessary friction.

---

## Decision

**Option A — Strip `LessonSections` to a simple scroll.** Delete all pagination state and UI from `lesson-sections.tsx`. Render all content top-to-bottom in one scrollable column. Footer is untouched.

---

## What Changes

### `app/src/components/lesson/lesson-sections.tsx` — complete rewrite

**Remove:**
- `NavItem` union type
- `activeIndex` state and `navigateTo` function
- `isFirst` / `isLast` / `active` derived values
- `dotLabel` and `renderActive` helper functions
- Up arrow button (top)
- Down arrow button (bottom)
- Dots column (`absolute left-3 top-1/2 -translate-y-1/2`)
- `absolute inset-0` single-item content container
- The middle `relative` div wrapper that anchored dots

**Replace with:**
A single `overflow-y-auto` scrollable column (`flex-1 min-h-0`) rendering all blocks in order with visual separators between them:

```
[intro block]        — if introContent present
── separator ──
[section 1]          — for each DbLessonSection
── separator ──
[section 2]
── ... ──
[outro block]        — if outroContent present
── separator ──
[ProblemPanel]       — if problemSummary present
```

**Separator:** The existing `label + horizontal rule` pattern (a `font-mono` label + `h-px bg-border/20` line) is kept as a visual divider between blocks. It provides structural orientation without being a navigation device.

**Outer sizing:** `flex-1 min-h-0 overflow-y-auto` — fills the pane and scrolls independently. Padding: `px-8 py-8`.

---

## What Does NOT Change

| File | Status |
|------|--------|
| `code-lesson-layout.tsx` | Untouched — props, layout, footer, header all unchanged |
| All template components | Untouched |
| `ProblemPanel` | Untouched — still renders at the end of the scroll |
| Footer (prev/next + CTA) | Untouched |
| `LessonSectionsProps` interface | Unchanged — same props, simpler rendering |

---

## Result

- One navigation system instead of two
- Zero clicks to reach the challenge — it's visible on scroll
- ~80 lines removed from `lesson-sections.tsx`, ~0 lines added
- No new dependencies
