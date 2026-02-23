-- Migration: replace module_schema with content_schema, drop dead modules columns
-- Run against: Neon Postgres (zuzu-codes project)

BEGIN;

-- 1. Drop dead columns from modules
ALTER TABLE modules DROP COLUMN IF EXISTS mdx_content;
ALTER TABLE modules DROP COLUMN IF EXISTS schema_version;

-- 2. Drop old table
DROP TABLE IF EXISTS module_schema;

-- 3. Create new table
CREATE TABLE content_schema (
  version     INTEGER PRIMARY KEY,
  description TEXT,
  schema_def  JSONB NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seed v1 active schema
INSERT INTO content_schema (version, description, schema_def, is_active)
VALUES (
  1,
  'Initial content schema — Python/AI course platform rules',
  '{
    "lesson_rules": {
      "maxChars": 8000,
      "requireH1": true,
      "allowedLanguages": ["python", "bash", "json", "text"],
      "disallowedHtmlPatterns": ["<script", "<iframe"]
    },
    "module_rules": {
      "minLessons": 1,
      "maxLessons": 20,
      "quizOptional": true
    },
    "quiz_rules": {
      "minPassingScore": 50,
      "maxPassingScore": 100,
      "minQuestions": 2,
      "maxQuestions": 20,
      "optionsPerQuestion": 4,
      "requiredFields": ["title", "questions", "passingScore"],
      "requiredQuestionFields": ["id", "statement", "options", "correctOption"],
      "validCorrectOptions": ["a", "b", "c", "d"]
    }
  }'::JSONB,
  TRUE
);

COMMIT;
