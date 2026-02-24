-- Drop dead column (no callers since test_cases migration)
ALTER TABLE lessons DROP COLUMN IF EXISTS test_code;

-- GIN index for JSONB queries on test_cases (Supabase Postgres best practice rule 8.1)
-- Partial index: only index rows that actually have test cases
CREATE INDEX IF NOT EXISTS idx_lessons_test_cases_gin
  ON lessons USING GIN (test_cases)
  WHERE test_cases IS NOT NULL;

-- Integrity constraint: if a lesson has test_cases it must also have entry_point
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_test_cases_entry_point_check'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_test_cases_entry_point_check
      CHECK (test_cases IS NULL OR entry_point IS NOT NULL);
  END IF;
END $$;
