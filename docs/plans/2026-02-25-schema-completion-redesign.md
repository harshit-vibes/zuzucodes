# Schema: Completion Redesign + Mandatory Quiz — Design

**Date**: 2026-02-25
**Status**: Approved

## Mental Model

- **Lesson completion = passing the code challenge.** Every lesson has mandatory test cases. No theory-only lessons.
- **Quiz is mandatory per module.** Every module has a quiz. Quiz pass always counts toward progress.
- **Single source of truth for lesson state:** `user_code` holds code, results, and the pass event timestamp.

---

## Schema Changes

### `user_code` — add `passed_at`

```sql
ALTER TABLE user_code ADD COLUMN passed_at TIMESTAMPTZ DEFAULT NULL;
```

- Set to `NOW()` on first all-pass. Never overwritten (preserves original pass timestamp).
- `NULL` = lesson attempted but not yet passed (or never attempted).
- Replaces `user_lesson_progress` as the source of truth for lesson completion.

### `user_lesson_progress` — dropped

Data migrated into `user_code.passed_at` first, then table dropped.

```sql
-- Step 1: create user_code rows for completions with no code row
INSERT INTO user_code (user_id, lesson_id, code, passed_at, updated_at)
SELECT ulp.user_id, ulp.lesson_id, '', ulp.completed_at, ulp.completed_at
FROM user_lesson_progress ulp
WHERE NOT EXISTS (
  SELECT 1 FROM user_code uc
  WHERE uc.user_id = ulp.user_id AND uc.lesson_id = ulp.lesson_id
);

-- Step 2: stamp passed_at on existing user_code rows
UPDATE user_code uc
SET passed_at = ulp.completed_at
FROM user_lesson_progress ulp
WHERE uc.user_id = ulp.user_id AND uc.lesson_id = ulp.lesson_id
  AND uc.passed_at IS NULL;

-- Step 3: drop
DROP TABLE user_lesson_progress;
```

### `modules` — enforce mandatory quiz

```sql
ALTER TABLE modules
  ADD CONSTRAINT modules_quiz_required CHECK (quiz_form IS NOT NULL);
```

Applied only after verifying all existing modules have `quiz_form` populated.

### `content_schema` — update active record

```sql
UPDATE content_schema
SET schema_def = jsonb_set(schema_def, '{module_rules,quizOptional}', 'false')
WHERE is_active = TRUE;
```

---

## DB Functions

All five functions replace `user_lesson_progress` with `user_code WHERE passed_at IS NOT NULL`.

### `get_batch_course_progress`

Two changes:
1. `completed_lessons` CTE: join `user_code uc ON uc.lesson_id = l.id AND uc.user_id = p_user_id AND uc.passed_at IS NOT NULL`
2. `total_items` CTE: remove `has_quiz` flag — quiz always counts. Change `SUM(COALESCE(lc.cnt, 0) + cm.has_quiz)` to `SUM(COALESCE(lc.cnt, 0) + 1)`. Remove the `has_quiz` column from the `course_modules` CTE.

### `get_batch_module_completion_status`

Replace `user_lesson_progress` join with:
```sql
(SELECT COUNT(*) FROM user_code uc
 JOIN lessons l ON l.id = uc.lesson_id
 WHERE uc.user_id = p_user_id AND l.module_id = m.id AND uc.passed_at IS NOT NULL)
```

### `get_dashboard_stats`

Streak CTE: replace `SELECT completed_at FROM user_lesson_progress WHERE user_id = p_user_id` with `SELECT passed_at FROM user_code WHERE user_id = p_user_id AND passed_at IS NOT NULL`.

### `get_resume_data`

Replace `user_lesson_progress ulp JOIN lessons l ON l.id = ulp.lesson_id` activity union arm with `user_code uc JOIN lessons l ON l.id = uc.lesson_id WHERE uc.passed_at IS NOT NULL`, using `uc.passed_at AS activity_time`.

### `get_section_completion_status`

Replace `user_lesson_progress` EXISTS subquery with `user_code WHERE passed_at IS NOT NULL AND lesson_id matches`.

---

## API Layer

### `/api/progress/lesson` — deleted

Completion is now written entirely by `/api/code/save`. This route is removed.

### `/api/code/save` — write `passed_at` on first pass

When `testResults` are all-pass, include `passed_at` in the upsert. Preserve original timestamp (don't overwrite):

```sql
INSERT INTO user_code (user_id, lesson_id, code, last_test_results, passed_at, updated_at)
VALUES ($userId, $lessonId, $code, $resultsJson, $passedAt, NOW())
ON CONFLICT (user_id, lesson_id) DO UPDATE SET
  code               = EXCLUDED.code,
  last_test_results  = EXCLUDED.last_test_results,
  passed_at          = CASE
                         WHEN user_code.passed_at IS NULL
                         THEN EXCLUDED.passed_at
                         ELSE user_code.passed_at
                       END,
  updated_at         = NOW()
```

Where `$passedAt = allPassed ? new Date().toISOString() : null`.

### `data.ts` — `isLessonCompleted`

```ts
SELECT 1 FROM user_code
WHERE user_id = $userId AND lesson_id = $lessonId AND passed_at IS NOT NULL
```

### `data.ts` — `UserCode` type

Add `passedAt: string | null` field. `getUserCode` selects `passed_at` and maps it.

### `CodeLessonLayout`

Remove the `/api/progress/lesson` fetch call that fires on all-pass. `passed_at` is now written by the save call that already fires.

---

## Mandatory Quiz Enforcement Summary

| Layer | Change |
|-------|--------|
| DB constraint | `CHECK (quiz_form IS NOT NULL)` on `modules` |
| `content_schema` | `quizOptional: false` |
| `get_batch_course_progress` | Always count +1 for quiz per module (remove `has_quiz` conditional) |
| App code | Validate `quiz_form` present on module create/update |

---

## Migration Order

1. Add `passed_at` to `user_code`
2. Migrate data from `user_lesson_progress` into `user_code.passed_at`
3. Drop `user_lesson_progress`
4. Update all five DB functions
5. Update `/api/code/save` to write `passed_at`
6. Delete `/api/progress/lesson` route
7. Update `data.ts` (`isLessonCompleted`, `getUserCode`)
8. Update `CodeLessonLayout` (remove progress/lesson fetch)
9. Add `modules_quiz_required` CHECK constraint (after verifying all modules have quizzes)
10. Update `content_schema`
