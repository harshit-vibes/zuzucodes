# Cleanup & Performance Design

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Full sweep across three dimensions: dead code removal, schema simplification, and React re-render optimization. All changes are grounded in confirmed findings — no speculative cleanup.

---

## Section 1: Dead Code & File Cleanup

| Action | File | Reason |
|--------|------|--------|
| Delete | `src/lib/db.ts` | Exact duplicate of `neon.ts`. All imports updated to `@/lib/neon` |
| Delete | `src/lib/validation.ts` | 700 lines validating non-existent fields. Zero callers in learner platform |
| Delete | `src/components/dashboard-main.tsx` | Replaced by inline conditional in dashboard layout |

---

## Section 2: Schema Migration

New file: `migrations/20260224-cleanup-perf.sql`

### Column Drops
```sql
ALTER TABLE modules DROP COLUMN IF EXISTS mdx_content;
ALTER TABLE user_quiz_attempts DROP COLUMN answers;
```

### DB Function: get_section_completion_status

**Problem:** Takes JSONB blob, expands it, runs EXISTS per element — O(N) correlated subqueries.

**Fix:** Accept `module_ids text[]`, return all lesson completion status via JOIN. Update `getSectionCompletionStatus()` in `data.ts` to pass `module_ids[]` instead of JSON.

New signature:
```sql
CREATE OR REPLACE FUNCTION get_section_completion_status(
  p_user_id text,
  p_module_ids text[]
)
RETURNS TABLE(module_id text, lesson_index integer, is_completed boolean)
```

### DB Function: get_batch_module_completion_status

**Problem:** Correlated subqueries per module row — two COUNT/EXISTS subqueries inside SELECT.

**Fix:** Rewrite using aggregate JOINs — single scan per table.

---

## Section 3: React Context Split

**Problem:** `CodeLessonLayout` subscribes to `remaining` + `resetAt` from `RateLimitContext`, causing full lesson layout re-render on every `increment()` call.

**Fix:** Split into two contexts in `rate-limit-context.tsx`:

```typescript
// Never changes after mount
RateLimitActionsContext = { increment, refresh }

// Changes on every run
RateLimitStateContext = { remaining, resetAt, isSyncing, lastSynced }
```

**New hooks:**
- `useRateLimitActions()` — used by `CodeLessonLayout` (stable, zero re-renders from count)
- `useRateLimitState()` — used by `RateLimitIndicator` (re-renders on footer only)
- `useRateLimit()` — kept as combined hook for convenience

**`CodeLessonLayout` change:** Replace `useRateLimit()` with `useRateLimitActions()`. Remove `remaining` + `resetAt` reads — the client-side guard moves into the `increment` action itself (returns false if at limit, caller shows error).

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db.ts` | Deleted |
| `src/lib/validation.ts` | Deleted |
| `src/components/dashboard-main.tsx` | Deleted — logic inlined into `dashboard/layout.tsx` |
| `src/app/dashboard/layout.tsx` | Inline `DashboardMain` logic, remove import |
| `src/context/rate-limit-context.tsx` | Split into two contexts, new hooks |
| `src/components/code-lesson-layout.tsx` | Switch to `useRateLimitActions()`, remove `remaining`/`resetAt` reads |
| `src/components/rate-limit-indicator.tsx` | Switch to `useRateLimitState()` |
| `src/lib/data.ts` | Update `getSectionCompletionStatus()` call to pass `module_ids[]` |
| `migrations/20260224-cleanup-perf.sql` | New: drop columns, rewrite 2 DB functions |
