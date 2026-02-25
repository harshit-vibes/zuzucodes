-- Migration: Schema hardening — normalize test_cases, problem columns, tighten constraints
-- Date: 2026-02-25
-- WARNING: Destructive. Clears user_code and user_quiz_attempts. Run seed after.

BEGIN;

-- 1. Clear user data that references lessons (avoids FK issues during restructure)
TRUNCATE user_code, user_quiz_attempts;

-- 2. Create test_cases table
CREATE TABLE test_cases (
  id          TEXT PRIMARY KEY,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  description TEXT NOT NULL,
  args        JSONB NOT NULL DEFAULT '[]',
  expected    JSONB NOT NULL,
  visible     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (lesson_id, position),
  CHECK (position >= 0),
  CHECK (jsonb_typeof(args) = 'array')
);

-- 3. Drop old JSONB columns from lessons
ALTER TABLE lessons
  DROP COLUMN IF EXISTS test_cases,
  DROP COLUMN IF EXISTS problem;

-- 4. Add flat problem columns to lessons
ALTER TABLE lessons
  ADD COLUMN problem_summary     TEXT,
  ADD COLUMN problem_constraints TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN problem_hints       TEXT[] NOT NULL DEFAULT '{}';

-- 5. Entry point requires code_template
ALTER TABLE lessons ADD CONSTRAINT lessons_entry_point_requires_template
  CHECK ((entry_point IS NULL) OR (code_template IS NOT NULL));

-- 6. Strengthen quiz_form structural validation
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_quiz_required;
ALTER TABLE modules ADD CONSTRAINT modules_quiz_required CHECK (
  quiz_form IS NOT NULL AND
  (quiz_form->>'title') IS NOT NULL AND
  jsonb_typeof(quiz_form->'questions') = 'array' AND
  jsonb_array_length(quiz_form->'questions') >= 1 AND
  (quiz_form->>'passingScore') IS NOT NULL AND
  (quiz_form->>'passingScore')::integer BETWEEN 0 AND 100
);

-- 7. score_percent range constraint
ALTER TABLE user_quiz_attempts ADD CONSTRAINT uqa_score_range
  CHECK (score_percent BETWEEN 0 AND 100);

-- 8. lesson_index non-negative
ALTER TABLE lessons ADD CONSTRAINT lessons_index_nonneg
  CHECK (lesson_index >= 0);

COMMIT;
