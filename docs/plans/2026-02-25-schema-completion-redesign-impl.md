# Schema Completion Redesign + Mandatory Quiz — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate lesson completion state into `user_code.passed_at`, drop the redundant `user_lesson_progress` table, and enforce mandatory quiz per module at the DB level.

**Architecture:** `passed_at TIMESTAMPTZ` is added to `user_code` as an immutable first-pass timestamp. All five Postgres progress functions are rewritten to query `user_code WHERE passed_at IS NOT NULL` instead of `user_lesson_progress`. The `/api/progress/lesson` route is deleted; `/api/code/save` takes over writing `passed_at` on first all-pass.

**Tech Stack:** Neon Postgres (raw SQL), Next.js App Router, TypeScript

**Branching note:** This plan builds on top of `feat/lesson-player-ux`. Create a new branch off that branch:
```bash
# From the lesson-player-ux worktree or after it's merged
git checkout feat/lesson-player-ux
git checkout -b feat/schema-completion-redesign
```

**Design doc:** `docs/plans/2026-02-25-schema-completion-redesign.md`

---

### Task 1: DB Migration — add passed_at, migrate data, drop user_lesson_progress

**Files:**
- Create: `app/migrations/2026-02-25-schema-completion-redesign.sql`

**Step 1: Write the migration file**

```sql
-- Migration: Schema completion redesign + mandatory quiz
-- Date: 2026-02-25
--
-- 1. Add passed_at to user_code (immutable first-pass timestamp)
-- 2. Migrate user_lesson_progress data into user_code.passed_at
-- 3. Drop user_lesson_progress
-- NOTE: Task 7 (modules_quiz_required constraint) is a separate manual step
--       run only after all modules are confirmed to have quiz_form populated.

BEGIN;

-- 1. Add passed_at column
ALTER TABLE user_code
  ADD COLUMN IF NOT EXISTS passed_at TIMESTAMPTZ DEFAULT NULL;

-- 2a. Insert user_code rows for completions with no existing code row
--     (users who completed lessons before code tracking was added)
INSERT INTO user_code (user_id, lesson_id, code, passed_at, updated_at)
SELECT ulp.user_id, ulp.lesson_id, '', ulp.completed_at, ulp.completed_at
FROM user_lesson_progress ulp
WHERE NOT EXISTS (
  SELECT 1 FROM user_code uc
  WHERE uc.user_id = ulp.user_id AND uc.lesson_id = ulp.lesson_id
);

-- 2b. Stamp passed_at on existing user_code rows that match a completion record
UPDATE user_code uc
SET passed_at = ulp.completed_at
FROM user_lesson_progress ulp
WHERE uc.user_id = ulp.user_id
  AND uc.lesson_id = ulp.lesson_id
  AND uc.passed_at IS NULL;

-- 3. Drop user_lesson_progress (data is now in user_code.passed_at)
DROP TABLE user_lesson_progress;

COMMIT;
```

**Step 2: Run against Neon DB**

```bash
psql $DATABASE_URL -f app/migrations/2026-02-25-schema-completion-redesign.sql
```
Expected: `ALTER TABLE`, `INSERT 0 N`, `UPDATE N`, `DROP TABLE` — no errors.

**Step 3: Verify**

```sql
-- passed_at column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_code' AND column_name = 'passed_at';

-- user_lesson_progress is gone
SELECT to_regclass('public.user_lesson_progress');
-- Expected: returns NULL
```

**Step 4: Commit**

```bash
git add app/migrations/2026-02-25-schema-completion-redesign.sql
git commit -m "feat: add passed_at to user_code, migrate and drop user_lesson_progress"
```

---

### Task 2: DB Functions — rewrite all five to use user_code.passed_at

**Files:**
- Create: `app/migrations/2026-02-25-schema-completion-redesign-functions.sql`

**Step 1: Write the functions migration**

```sql
-- Migration: Update all progress DB functions to use user_code.passed_at
-- Date: 2026-02-25

BEGIN;

-- ─── get_batch_course_progress ───────────────────────────────────────────────
-- Changes:
--   • completed_lessons CTE: join user_code WHERE passed_at IS NOT NULL
--   • total_items CTE: quiz always counts (+1), removes has_quiz conditional
CREATE OR REPLACE FUNCTION public.get_batch_course_progress(p_user_id text, p_course_ids text[])
RETURNS TABLE(course_id text, progress_percent integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH course_modules AS (
    SELECT m.course_id, m.id AS module_id
    FROM modules m WHERE m.course_id = ANY(p_course_ids)
  ),
  lesson_counts AS (
    SELECT l.module_id, COUNT(*) AS cnt
    FROM lessons l
    WHERE l.module_id IN (SELECT module_id FROM course_modules)
    GROUP BY l.module_id
  ),
  total_items AS (
    SELECT cm.course_id,
      SUM(COALESCE(lc.cnt, 0) + 1) AS total_count  -- +1: quiz always mandatory
    FROM course_modules cm
    LEFT JOIN lesson_counts lc ON lc.module_id = cm.module_id
    GROUP BY cm.course_id
  ),
  completed_lessons AS (
    SELECT cm.course_id, COUNT(*) AS completed_count
    FROM course_modules cm
    JOIN lessons l ON l.module_id = cm.module_id
    JOIN user_code uc ON uc.lesson_id = l.id
      AND uc.user_id = p_user_id
      AND uc.passed_at IS NOT NULL
    GROUP BY cm.course_id
  ),
  passed_quizzes AS (
    SELECT cm.course_id, COUNT(DISTINCT uqa.module_id) AS quiz_count
    FROM course_modules cm
    JOIN user_quiz_attempts uqa
      ON uqa.module_id = cm.module_id
      AND uqa.user_id = p_user_id
      AND uqa.passed = true
    GROUP BY cm.course_id
  )
  SELECT
    t.course_id,
    CASE WHEN t.total_count > 0
      THEN ROUND(
        (COALESCE(cl.completed_count, 0) + COALESCE(pq.quiz_count, 0))::NUMERIC
        / t.total_count * 100
      )::INTEGER
      ELSE 0
    END AS progress_percent,
    (COALESCE(cl.completed_count, 0) + COALESCE(pq.quiz_count, 0)) >= t.total_count
      AS is_completed
  FROM total_items t
  LEFT JOIN completed_lessons cl ON cl.course_id = t.course_id
  LEFT JOIN passed_quizzes    pq ON pq.course_id = t.course_id;
END;
$$;

-- ─── get_batch_module_completion_status ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_batch_module_completion_status(p_user_id text, p_module_ids text[])
RETURNS TABLE(module_id text, all_lessons_completed boolean, quiz_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS module_id,
    COALESCE(
      (SELECT COUNT(*) FROM user_code uc
       JOIN lessons l ON l.id = uc.lesson_id
       WHERE uc.user_id = p_user_id
         AND l.module_id = m.id
         AND uc.passed_at IS NOT NULL)
      >=
      (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id),
      false
    ) AS all_lessons_completed,
    COALESCE(
      (SELECT EXISTS (
        SELECT 1 FROM user_quiz_attempts uqa
        WHERE uqa.user_id = p_user_id
          AND uqa.module_id = m.id
          AND uqa.passed = true
      )),
      false
    ) AS quiz_completed
  FROM modules m WHERE m.id = ANY(p_module_ids);
END;
$$;

-- ─── get_dashboard_stats ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id text)
RETURNS TABLE(streak integer, courses_in_progress integer, courses_total integer, quiz_average integer)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      COUNT(DISTINCT c.id) AS total_courses,
      COUNT(DISTINCT CASE
        WHEN EXISTS (
          SELECT 1 FROM modules m2
          JOIN lessons l2 ON l2.module_id = m2.id
          JOIN user_code uc ON uc.lesson_id = l2.id
            AND uc.user_id = p_user_id
            AND uc.passed_at IS NOT NULL
          WHERE m2.course_id = c.id
        ) THEN c.id
      END) AS in_progress_courses
    FROM courses c
  ),
  quiz_stats AS (
    SELECT ROUND(AVG(score_percent))::INTEGER AS avg_score
    FROM user_quiz_attempts
    WHERE user_id = p_user_id
  )
  SELECT
    0 AS streak,
    cs.in_progress_courses::INTEGER,
    cs.total_courses::INTEGER,
    COALESCE(qs.avg_score, 0)::INTEGER
  FROM course_stats cs CROSS JOIN quiz_stats qs;
END;
$$;

-- ─── get_resume_data ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_resume_data(p_user_id text)
RETURNS TABLE(course_id text, course_title text, module_id text, module_title text, last_accessed timestamp with time zone)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title, m.id, m.title, MAX(activity.activity_time) AS last_accessed
  FROM courses c
  JOIN modules m ON m.course_id = c.id
  JOIN (
    SELECT l.module_id, uc.passed_at AS activity_time
    FROM user_code uc
    JOIN lessons l ON l.id = uc.lesson_id
    WHERE uc.user_id = p_user_id AND uc.passed_at IS NOT NULL
    UNION ALL
    SELECT uqa.module_id, uqa.attempted_at AS activity_time
    FROM user_quiz_attempts uqa
    WHERE uqa.user_id = p_user_id
  ) activity ON activity.module_id = m.id
  GROUP BY c.id, c.title, m.id, m.title
  ORDER BY last_accessed DESC
  LIMIT 1;
END;
$$;

-- ─── get_section_completion_status ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_section_completion_status(p_user_id text, p_modules jsonb)
RETURNS TABLE(module_id text, section_index integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    (module_data->>'module_id')::TEXT         AS module_id,
    (module_data->>'section_index')::INTEGER  AS section_index,
    EXISTS (
      SELECT 1 FROM user_code uc
      JOIN lessons l ON l.id = uc.lesson_id
      WHERE uc.user_id = p_user_id
        AND uc.passed_at IS NOT NULL
        AND l.module_id    = (module_data->>'module_id')
        AND l.lesson_index = (module_data->>'section_index')::INTEGER
    ) AS is_completed
  FROM jsonb_array_elements(p_modules) AS module_data;
END;
$$;

COMMIT;
```

**Step 2: Run against Neon DB**

```bash
psql $DATABASE_URL -f app/migrations/2026-02-25-schema-completion-redesign-functions.sql
```
Expected: `CREATE FUNCTION` five times — no errors.

**Step 3: Commit**

```bash
git add app/migrations/2026-02-25-schema-completion-redesign-functions.sql
git commit -m "feat: update all 5 progress DB functions to use user_code.passed_at"
```

---

### Task 3: Update /api/code/save to write passed_at on first all-pass

**Files:**
- Modify: `app/src/app/api/code/save/route.ts`

**Context:** The current route accepts `{ lessonId, code, testResults }`. It needs to compute `allPassed` from `testResults` server-side and set `passed_at = NOW()` in the upsert — but only if `passed_at` is not already set (preserve original timestamp).

**Step 1: Replace the entire file**

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return new NextResponse(null, { status: 204 });
  }

  const { lessonId, code, testResults } = await req.json();

  if (!lessonId || typeof lessonId !== 'string' || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing lessonId or code' }, { status: 400 });
  }

  const resultsJson = testResults !== undefined ? testResults : null;

  // Compute allPassed server-side — don't trust the client for this
  const allPassed =
    Array.isArray(resultsJson) &&
    resultsJson.length > 0 &&
    (resultsJson as Array<{ pass: boolean }>).every(r => r.pass === true);

  const passedAt = allPassed ? new Date().toISOString() : null;

  if (resultsJson !== null) {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, last_test_results, passed_at, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, ${JSON.stringify(resultsJson)}, ${passedAt}, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        code              = EXCLUDED.code,
        last_test_results = EXCLUDED.last_test_results,
        passed_at         = CASE
                              WHEN user_code.passed_at IS NULL
                              THEN EXCLUDED.passed_at
                              ELSE user_code.passed_at
                            END,
        updated_at        = NOW()
    `;
  } else {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        code       = EXCLUDED.code,
        updated_at = NOW()
    `;
  }

  return new NextResponse(null, { status: 204 });
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/app/api/code/save/route.ts
git commit -m "feat: write passed_at in /api/code/save on first all-pass"
```

---

### Task 4: Delete /api/progress/lesson route

**Files:**
- Delete: `app/src/app/api/progress/lesson/route.ts`
- Delete: `app/src/app/api/progress/lesson/` directory (if empty after deletion)

**Step 1: Delete the route file**

```bash
rm app/src/app/api/progress/lesson/route.ts
rmdir app/src/app/api/progress/lesson 2>/dev/null || true
rmdir app/src/app/api/progress 2>/dev/null || true
```

**Step 2: Type-check to confirm no imports remain**

```bash
cd app && npx tsc --noEmit
```
Expected: 0 errors. (The route file had no TypeScript imports from app code.)

**Step 3: Commit**

```bash
git add -A app/src/app/api/progress/
git commit -m "feat: delete /api/progress/lesson route (completion now via /api/code/save)"
```

---

### Task 5: Update data.ts — UserCode type, getUserCode, isLessonCompleted, streak/activity queries

**Files:**
- Modify: `app/src/lib/data.ts`

**Context:** Four changes in this file:
1. Add `passedAt` to `UserCode` interface
2. Update `getUserCode` to select and return `passed_at`
3. Update `isLessonCompleted` to query `user_code`
4. Update three raw SQL queries in app-level functions that union `user_lesson_progress` with `user_quiz_attempts` for streak/activity

**Step 1: Update `UserCode` interface**

Find:
```ts
export interface UserCode {
  code: string;
  lastTestResults: import('@/lib/judge0').TestCaseResult[] | null;
}
```
Replace with:
```ts
export interface UserCode {
  code: string;
  lastTestResults: import('@/lib/judge0').TestCaseResult[] | null;
  passedAt: string | null;
}
```

**Step 2: Update `getUserCode` to select and return `passed_at`**

Find:
```ts
export async function getUserCode(userId: string, lessonId: string): Promise<UserCode | null> {
  try {
    const result = await sql`
      SELECT code, last_test_results FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    if (result.length === 0) return null;
    const row = result[0] as any;
    return {
      code: row.code,
      lastTestResults: (row.last_test_results as import('@/lib/judge0').TestCaseResult[] | null) ?? null,
    };
```
Replace with:
```ts
export async function getUserCode(userId: string, lessonId: string): Promise<UserCode | null> {
  try {
    const result = await sql`
      SELECT code, last_test_results, passed_at FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    if (result.length === 0) return null;
    const row = result[0] as any;
    return {
      code: row.code,
      lastTestResults: (row.last_test_results as import('@/lib/judge0').TestCaseResult[] | null) ?? null,
      passedAt: row.passed_at ? (row.passed_at as Date).toISOString() : null,
    };
```

**Step 3: Update `isLessonCompleted` to query `user_code`**

Find:
```ts
export async function isLessonCompleted(userId: string, lessonId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_lesson_progress
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    return result.length > 0;
  } catch (error) {
    console.error('isLessonCompleted error:', error);
    return false;
  }
}
```
Replace with:
```ts
export async function isLessonCompleted(userId: string, lessonId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId} AND passed_at IS NOT NULL
    `;
    return result.length > 0;
  } catch (error) {
    console.error('isLessonCompleted error:', error);
    return false;
  }
}
```

**Step 4: Update streak query in `getDashboardStats`**

Find (inside `getDashboardStats`):
```ts
    const activityDates = await sql`
      SELECT completed_at FROM user_lesson_progress
      WHERE user_id = ${userId} AND completed_at >= NOW() - INTERVAL '366 days'
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= NOW() - INTERVAL '366 days'
      ORDER BY completed_at DESC
    `;
```
Replace with:
```ts
    const activityDates = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId}
        AND passed_at IS NOT NULL
        AND passed_at >= NOW() - INTERVAL '366 days'
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= NOW() - INTERVAL '366 days'
      ORDER BY completed_at DESC
    `;
```

**Step 5: Update weekly activity query in `getWeeklyActivity`**

Find (inside `getWeeklyActivity`):
```ts
    const data = await sql`
      SELECT completed_at FROM user_lesson_progress
      WHERE user_id = ${userId} AND completed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;
```
Replace with:
```ts
    const data = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId} AND passed_at IS NOT NULL AND passed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;
```

**Step 6: Update activity heatmap query in `getActivityHeatmap`**

Find (inside `getActivityHeatmap`):
```ts
    const data = await sql`
      SELECT completed_at FROM user_lesson_progress
      WHERE user_id = ${userId} AND completed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;
```
Replace with:
```ts
    const data = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId} AND passed_at IS NOT NULL AND passed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;
```

**Step 7: Update the resume data query in `getResumeData`**

Find (inside `getResumeData`, the raw SQL UNION for `recentActivity`):
```ts
    const recentActivity = await sql`
      SELECT l.module_id, l.lesson_index AS section_index, ulp.completed_at
      FROM user_lesson_progress ulp
      JOIN lessons l ON l.id = ulp.lesson_id
      WHERE ulp.user_id = ${userId}
      UNION ALL
      SELECT module_id, NULL AS section_index, attempted_at AS completed_at
      FROM user_quiz_attempts
      WHERE user_id = ${userId}
      ORDER BY completed_at DESC
      LIMIT 50
    `;
```
Replace with:
```ts
    const recentActivity = await sql`
      SELECT l.module_id, l.lesson_index AS section_index, uc.passed_at AS completed_at
      FROM user_code uc
      JOIN lessons l ON l.id = uc.lesson_id
      WHERE uc.user_id = ${userId} AND uc.passed_at IS NOT NULL
      UNION ALL
      SELECT module_id, NULL AS section_index, attempted_at AS completed_at
      FROM user_quiz_attempts
      WHERE user_id = ${userId}
      ORDER BY completed_at DESC
      LIMIT 50
    `;
```

**Step 8: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: 0 errors.

**Step 9: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: update data.ts — UserCode.passedAt, isLessonCompleted from user_code, remove user_lesson_progress queries"
```

---

### Task 6: Remove /api/progress/lesson call from CodeLessonLayout

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**Context:** Inside `handleRun`, there is still a fetch to `/api/progress/lesson` that fires when `testResult.allPassed`. The `/api/code/save` call (already present) now writes `passed_at` directly — the progress/lesson call is redundant and must be removed.

**Step 1: Remove the fetch block**

Find (inside the `if (testResult.allPassed)` block):
```ts
          if (testResult.allPassed) {
            if (isAuthenticated && !isCompleted) {
              fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, courseId }),
              }).catch(() => {});
            }
            setShowCelebration(true);
```
Replace with:
```ts
          if (testResult.allPassed) {
            setShowCelebration(true);
```

**Step 2: The `courseId` prop may now be unused** — check if `courseId` is referenced anywhere else in the file. If it's only used in the deleted fetch call, remove it from the props interface and destructuring too.

Search the file for all uses of `courseId`. If it only appears in:
- The props interface
- The destructuring
- The deleted fetch call

Then remove it from the interface and destructuring as well. If it's used elsewhere (e.g. for navigation links like `nextHref`), leave it.

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Lint**

```bash
cd app && npm run lint
```

**Step 5: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: remove /api/progress/lesson call from CodeLessonLayout"
```

---

### Task 7: Mandatory quiz — DB constraint + content_schema update

**⚠️ PREREQUISITE:** Before running this task, verify that ALL modules in the database have `quiz_form IS NOT NULL`:

```sql
SELECT id, title FROM modules WHERE quiz_form IS NULL;
```

If any rows are returned, add quizzes to those modules before proceeding. Only run this task when the above query returns 0 rows.

**Files:**
- Create: `app/migrations/2026-02-25-mandatory-quiz-constraint.sql`

**Step 1: Write the migration**

```sql
-- Migration: Enforce mandatory quiz per module
-- Date: 2026-02-25
-- PREREQUISITE: All modules must have quiz_form IS NOT NULL before running.
-- Verify: SELECT id, title FROM modules WHERE quiz_form IS NULL;

BEGIN;

-- Enforce at DB level: modules must have a quiz
ALTER TABLE modules
  ADD CONSTRAINT modules_quiz_required CHECK (quiz_form IS NOT NULL);

-- Update content schema to reflect quizOptional: false
UPDATE content_schema
SET schema_def = jsonb_set(schema_def, '{module_rules,quizOptional}', 'false')
WHERE is_active = TRUE;

COMMIT;
```

**Step 2: Run only after prerequisite is confirmed**

```bash
psql $DATABASE_URL -f app/migrations/2026-02-25-mandatory-quiz-constraint.sql
```
Expected: `ALTER TABLE`, `UPDATE 1` — no errors.

**Step 3: Commit**

```bash
git add app/migrations/2026-02-25-mandatory-quiz-constraint.sql
git commit -m "feat: add modules_quiz_required CHECK constraint, set quizOptional=false in content_schema"
```

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `app/migrations/2026-02-25-schema-completion-redesign.sql` | New — adds `passed_at`, migrates data, drops `user_lesson_progress` |
| `app/migrations/2026-02-25-schema-completion-redesign-functions.sql` | New — rewrites all 5 DB functions |
| `app/migrations/2026-02-25-mandatory-quiz-constraint.sql` | New — CHECK constraint + content_schema update (conditional) |
| `app/src/app/api/code/save/route.ts` | Writes `passed_at` on first all-pass |
| `app/src/app/api/progress/lesson/route.ts` | Deleted |
| `app/src/lib/data.ts` | `UserCode.passedAt`, `isLessonCompleted`, 4 query updates |
| `app/src/components/lesson/code-lesson-layout.tsx` | Remove `/api/progress/lesson` fetch |
