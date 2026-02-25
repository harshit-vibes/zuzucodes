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
