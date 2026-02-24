-- Migration: Add Judge0-native test cases support to lessons table
-- Date: 2026-02-24
--
-- test_cases: JSONB array of {description, args, expected}
-- entry_point: Python function name to call (e.g. "greet", "add")
-- test_code is kept (not dropped) to preserve existing seed data during transition

BEGIN;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entry_point TEXT DEFAULT NULL;

COMMIT;
