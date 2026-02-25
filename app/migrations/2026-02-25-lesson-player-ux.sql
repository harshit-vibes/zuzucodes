-- Migration: Lesson player UX improvements
-- Date: 2026-02-25
--
-- lessons.problem: JSONB for structured problem statement { summary, constraints[], hints[] }
-- user_code.last_test_results: JSONB array of TestCaseResult for result persistence

BEGIN;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS problem JSONB DEFAULT NULL;

ALTER TABLE user_code
  ADD COLUMN IF NOT EXISTS last_test_results JSONB DEFAULT NULL;

COMMIT;
