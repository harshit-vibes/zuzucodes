-- Migration: Template system — lesson_sections table + intro/outro JSONB columns
-- Date: 2026-02-26
-- Safe: all new additions, no destructive changes. Run seed after.

BEGIN;

-- 1. lesson_sections table (replaces content TEXT splitting)
CREATE TABLE lesson_sections (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  template    TEXT NOT NULL,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, position),
  CHECK (position >= 0),
  CHECK (jsonb_typeof(content) = 'object'),
  CHECK (template IN ('code-section', 'prose-section', 'challenge-section'))
);

-- 2. Lesson intro/outro
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE lessons
  ADD CONSTRAINT lessons_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT lessons_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- 3. Module intro/outro
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE modules
  ADD CONSTRAINT modules_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT modules_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- 4. Course intro/outro
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE courses
  ADD CONSTRAINT courses_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT courses_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

COMMIT;
