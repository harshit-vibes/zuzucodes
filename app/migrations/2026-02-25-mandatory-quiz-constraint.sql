-- Migration: Enforce mandatory quiz per module
-- Date: 2026-02-25
-- PREREQUISITE: All modules must have quiz_form IS NOT NULL before running.
-- Verify first: SELECT id, title FROM modules WHERE quiz_form IS NULL;

BEGIN;

-- Enforce at DB level: modules must have a quiz
ALTER TABLE modules
  ADD CONSTRAINT modules_quiz_required CHECK (quiz_form IS NOT NULL);

-- Update content schema to reflect quizOptional: false
UPDATE content_schema
SET schema_def = jsonb_set(schema_def, '{module_rules,quizOptional}', 'false')
WHERE is_active = TRUE;

COMMIT;
