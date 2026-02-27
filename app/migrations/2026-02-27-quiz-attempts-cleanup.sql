-- Drop redundant index on user_quiz_attempts (superseded by UNIQUE constraint uqa_user_module_unique)
DROP INDEX IF EXISTS idx_user_quiz_attempts_user_module;

-- Make attempted_at NOT NULL (it always has a value; DEFAULT NOW() already set)
ALTER TABLE user_quiz_attempts
  ALTER COLUMN attempted_at SET NOT NULL;
