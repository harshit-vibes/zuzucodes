# Challenge Pane + Progress Tracking Design

## Overview

Two parallel improvements:
1. Challenge pane redesigned with compact two-column layout and hint slide-over
2. Progress tracking enhanced to skip lesson intro and show 3-state sidebar

---

## Section 1: Challenge Pane Redesign

### Layout

`ProblemPanel` switches from a vertical stack to a **two-column layout**:
- **Left column** (`flex-1`): `challenge` label + summary text + visible examples as `fn(args) → result` lines + constraint pills
- **Right column** (`w-10 shrink-0`): lightbulb icon button labeled `hints`

The existing `maxHeight: '40%'` constraint is replaced by a fixed compact height (roughly `min-h-0` + natural content height). No overflow scroll on the outer panel.

### Hint Slide-Over

The panel wrapper becomes `relative overflow-hidden`. When the hint button is clicked, an overlay div (`absolute inset-0`) slides in from the right using a CSS transition (`translate-x-full` → `translate-x-0`).

The overlay:
- Has a semi-transparent backdrop (`bg-background/90 dark:bg-zinc-950/90 backdrop-blur-sm`) — challenge+examples are visible but dimmed behind
- Shows: `hint  N / total` counter at top-right + `✕` close button
- Shows hint text for the current slide
- `← prev` and `next →` navigation buttons at the bottom
- On the **last hint slide**: `next →` is replaced by `[ view solution → ]` button

Clicking "view solution" calls `onViewSolution()` (new prop on `ProblemPanel`) and closes the overlay.

### State

```ts
const [hintsOpen, setHintsOpen] = useState(false);
const [hintIndex, setHintIndex] = useState(0);   // 0-based, resets on close
const isLastHint = hintIndex === problemHints.length - 1;
```

No hints → right column hint button is hidden.

### Toolbar Solution Button

The `solution` button in `code-lesson-layout.tsx` editor toolbar is **removed**. Solution is now only accessible after viewing all hints in the panel.

### New Prop

```ts
// ProblemPanel
onViewSolution?: () => void;

// CodeLessonLayout passes:
onViewSolution={() => solutionCode ? handleCodeChange(solutionCode) : undefined}
```

---

## Section 2: Progress Tracking

### 2a — Lesson Intro Skip

`view` initial state in `CodeLessonLayout`:

```ts
const [view, setView] = useState<'intro' | 'content' | 'outro'>(
  isCompleted || savedCode !== null ? 'content' : 'intro'
);
```

- First visit, no code → intro shows
- Return after any autosave → skips to content
- Return after passing → skips to content (review mode, saved code already loaded via `savedCode` prop)

No DB migration needed.

### 2b — 3-State Sidebar Progress

Three lesson states: `not-started` | `in-progress` | `completed`

**New data query** added to `getSectionCompletionStatus` in `data.ts`:

```sql
SELECT DISTINCT lesson_id FROM user_code
WHERE user_id = $1
  AND lesson_id = ANY($2)
  AND passed_at IS NULL
```

Combined with existing `passed` lesson set → three-state map keyed by `"{moduleId}:lesson-{i}"`.

Return type extended:
```ts
type SectionStatus = 'not-started' | 'in-progress' | 'completed';
// map: `{moduleId}:lesson-{i}` → SectionStatus
//      `{moduleId}:quiz`       → 'not-started' | 'completed'
```

**Sidebar lesson dot** (`app-sidebar.tsx`):
- `not-started`: empty ring (`ring-1 ring-border/40`)
- `in-progress`: primary ring (`ring-1 ring-primary/50 bg-primary/10`)
- `completed`: filled success (`bg-success/80`)

**Module section tint**:
- No activity → no tint
- Any lesson in-progress → `bg-primary/5 ring-1 ring-primary/10` (same as current active tint)
- All lessons + quiz completed → `bg-success/5 ring-1 ring-success/10`

The `isActiveModule` prop on `ModuleSection` expands to carry `moduleStatus: 'not-started' | 'in-progress' | 'completed'` computed from the children's states.

---

## Files Affected

| File | Change |
|------|--------|
| `app/src/components/lesson/problem-panel.tsx` | Full redesign: two-col layout, hint slide-over, onViewSolution prop |
| `app/src/components/lesson/code-lesson-layout.tsx` | Remove toolbar solution button, pass onViewSolution callback, fix view initial state |
| `app/src/lib/data.ts` | Extend getSectionCompletionStatus to return 3-state map |
| `app/src/components/shared/app-sidebar.tsx` | 3-state lesson dots, module tint from status |

No DB migration required.
