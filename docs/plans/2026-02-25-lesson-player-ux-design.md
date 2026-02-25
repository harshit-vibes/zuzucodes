# Lesson Player UX Improvements — Design

**Date**: 2026-02-25
**Status**: Approved

## Overview

Three targeted improvements to the lesson player experience:

1. **Celebration + explicit next** — replace auto-navigation on pass with confetti + prominent next button
2. **Result persistence** — restore test results and execution state when revisiting a lesson
3. **Problem statement panel** — structured problem brief above the code editor

---

## Data Model Changes

### `lessons` table

```sql
ALTER TABLE lessons ADD COLUMN problem JSONB DEFAULT NULL;
```

```ts
interface LessonProblem {
  summary: string;        // 1–3 sentence brief
  constraints?: string[]; // e.g. ["1 ≤ n ≤ 1000"]
  hints?: string[];       // revealed one at a time
}
```

### `TestCase` type — add `visible` flag

No migration needed (JSONB is schema-flexible). Add to TypeScript type only:

```ts
interface TestCase {
  description: string;
  args: unknown[];
  expected: unknown;
  visible?: boolean; // if true, shown as example in problem panel
}
```

### `user_code` table

```sql
ALTER TABLE user_code ADD COLUMN last_test_results JSONB DEFAULT NULL;
```

Stores `TestCaseResult[]`. Written on every run alongside code. Read back on page load.

---

## API & Data Layer

### `/api/code/save` (POST)

Extended body:
```ts
{ lessonId: string; code: string; testResults?: TestCaseResult[] | null }
```
Writes both `code` and `last_test_results` in a single upsert. If `testResults` omitted, only `code` updated (backwards-compatible).

### `getUserCode` in `data.ts`

Returns `UserCode | null` instead of `string | null`:
```ts
interface UserCode {
  code: string;
  lastTestResults: TestCaseResult[] | null;
}
```

### `LessonData` in `data.ts`

Add `problem: LessonProblem | null` field. `getLesson()` SELECT gets `l.problem`.

### `LessonPage` (server component)

Passes `lastTestResults` and `problem` down to `CodeLessonLayout`. `savedCode` prop becomes `userCode: UserCode | null`.

---

## Components

### `CodeLessonLayout`

- Remove `router.push(nextHref)` and 700ms delay on `allPassed`
- Add `showCelebration: boolean` state, set `true` on `allPassed`
- On `showCelebration = true`: fire `canvas-confetti` once — origin `{ x: 0.5, y: 1 }`, spread 70, particles 80, colors from theme vars, duration ~1.2s
- Footer next button: muted by default; transitions to `bg-primary text-primary-foreground` with single `animate-bounce` when `showCelebration || isCompleted`
- On mount: if `lastTestResults` non-null, hydrate `testResults`, set `executionPhase` to `run-pass`/`run-fail`, set `hasRun = true`
- `handleRun`: after receiving results, fire save with `testResults` payload immediately (not debounced)
- New prop: `problem: LessonProblem | null`

### New `ProblemPanel` (`app/src/components/lesson/problem-panel.tsx`)

Renders above `CodeEditor` in the code pane. Collapsible (open by default). Sections:

1. **Summary** — `text-sm text-foreground/80`
2. **Examples** — from `testCases.filter(tc => tc.visible)`, rendered as `entry_point(args) → expected` in monospace
3. **Constraints** — `text-xs font-mono text-muted-foreground` badge list
4. **Hints** — hidden behind "show hint →" toggle, revealed one at a time

Collapse state stored in `localStorage` keyed by `lessonId`. Renders nothing if `problem` is null.

### `OutputPanel`

No changes — hydrated state from `CodeLessonLayout` means it renders correctly on mount.

---

## UX Flows

| Scenario | Behaviour |
|----------|-----------|
| First visit | Template code, problem panel open, output idle, next button muted |
| Tests fail | Results shown, next muted, partial results saved to DB |
| All tests pass | Confetti fires once, next button prominent, results saved, progress marked |
| Revisit completed | Output hydrates to run-pass + tests tab, next button prominent, no confetti |
| Revisit incomplete | Output hydrates to run-fail, user sees where they left off |
| Unauthenticated | Ephemeral — no save/hydration, confetti still fires, problem panel still shows |
| `problem` is null | ProblemPanel renders nothing, no visual gap |

---

## Dependencies

- `canvas-confetti` — new npm dependency (`app/`)
- One DB migration (2 `ALTER TABLE` statements)
