-- 2026-02-27: Replace onboarding_form + completion_form with single confidence_form (Likert schema)

BEGIN;

-- Drop old weak constraints
ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_onboarding_is_object,
  DROP CONSTRAINT IF EXISTS courses_completion_is_object;

-- Drop old MCQ form columns
ALTER TABLE courses
  DROP COLUMN IF EXISTS onboarding_form,
  DROP COLUMN IF EXISTS completion_form;

-- Add confidence_form (nullable — seed populates values; validate-content enforces non-null)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS confidence_form JSONB;

-- Strict CHECK: must have title (string) + questions (non-empty array)
ALTER TABLE courses
  ADD CONSTRAINT courses_confidence_form_check CHECK (
    confidence_form IS NULL OR (
      confidence_form ? 'title'
      AND confidence_form ? 'questions'
      AND jsonb_typeof(confidence_form->'questions') = 'array'
      AND jsonb_array_length(confidence_form->'questions') >= 1
    )
  );

COMMIT;
