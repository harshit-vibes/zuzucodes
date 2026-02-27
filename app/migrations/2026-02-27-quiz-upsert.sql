-- 2026-02-27: Quiz upsert — one row per (user_id, module_id), mirrors user_code pattern

BEGIN;

-- Remove duplicate attempts, keep only the latest per (user_id, module_id)
DELETE FROM user_quiz_attempts a
USING user_quiz_attempts b
WHERE a.user_id = b.user_id
  AND a.module_id = b.module_id
  AND a.attempted_at < b.attempted_at;

-- Add unique constraint enabling ON CONFLICT upsert
ALTER TABLE user_quiz_attempts
  ADD CONSTRAINT uqa_user_module_unique UNIQUE (user_id, module_id);

COMMIT;
