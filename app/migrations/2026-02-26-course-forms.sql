-- Migration: Course-level onboarding + completion forms
-- Date: 2026-02-26
-- Safe: additive only. No destructive changes.

BEGIN;

-- 1. Add form columns to courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS onboarding_form JSONB,
  ADD COLUMN IF NOT EXISTS completion_form JSONB;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_onboarding_is_object'
      AND conrelid = 'courses'::regclass
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_onboarding_is_object
        CHECK (onboarding_form IS NULL OR jsonb_typeof(onboarding_form) = 'object');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_completion_is_object'
      AND conrelid = 'courses'::regclass
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_completion_is_object
        CHECK (completion_form IS NULL OR jsonb_typeof(completion_form) = 'object');
  END IF;
END $$;

-- 2. Responses table
CREATE TABLE IF NOT EXISTS user_course_form_responses (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id      TEXT NOT NULL,
  course_id    TEXT NOT NULL,
  form_type    TEXT NOT NULL,
  responses    JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id, form_type),
  CHECK (form_type IN ('onboarding', 'completion')),
  CHECK (jsonb_typeof(responses) = 'object')
);

CREATE INDEX IF NOT EXISTS user_course_form_responses_user_course
  ON user_course_form_responses (user_id, course_id);

COMMIT;
