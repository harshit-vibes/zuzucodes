BEGIN;

-- =====================================================
-- 1. Drop unused column: user_quiz_attempts.answers
-- =====================================================
ALTER TABLE user_quiz_attempts DROP COLUMN IF EXISTS answers;


-- =====================================================
-- 2. Drop unused DB function: get_section_completion_status
--    Zero TypeScript callers confirmed.
-- =====================================================
DROP FUNCTION IF EXISTS get_section_completion_status(text, jsonb);


-- =====================================================
-- 3. Rewrite get_batch_module_completion_status
--    Current: two correlated subqueries per module row (O(N) scans)
--    Fix: three CTEs with aggregate JOINs (single scan per table)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_batch_module_completion_status(
  p_user_id    text,
  p_module_ids text[]
)
RETURNS TABLE(module_id text, all_lessons_completed boolean, quiz_completed boolean)
LANGUAGE sql AS $$
  WITH lesson_totals AS (
    -- Count lessons per module (single scan of lessons table)
    SELECT l.module_id, COUNT(*) AS total
    FROM lessons l
    WHERE l.module_id = ANY(p_module_ids)
    GROUP BY l.module_id
  ),
  lesson_completions AS (
    -- Count completed lessons per module (single scan of user_lesson_progress + lessons)
    SELECT l.module_id, COUNT(*) AS completed
    FROM user_lesson_progress ulp
    JOIN lessons l ON l.id = ulp.lesson_id
    WHERE ulp.user_id = p_user_id
      AND l.module_id = ANY(p_module_ids)
    GROUP BY l.module_id
  ),
  quiz_completions AS (
    -- Check passed quiz per module (single scan of user_quiz_attempts)
    SELECT uqa.module_id, bool_or(uqa.passed) AS quiz_passed
    FROM user_quiz_attempts uqa
    WHERE uqa.user_id = p_user_id
      AND uqa.module_id = ANY(p_module_ids)
    GROUP BY uqa.module_id
  )
  SELECT
    m.id AS module_id,
    COALESCE(lc.completed, 0) >= COALESCE(lt.total, 0) AS all_lessons_completed,
    COALESCE(qc.quiz_passed, false)                     AS quiz_completed
  FROM modules m
  LEFT JOIN lesson_totals     lt ON lt.module_id = m.id
  LEFT JOIN lesson_completions lc ON lc.module_id = m.id
  LEFT JOIN quiz_completions   qc ON qc.module_id = m.id
  WHERE m.id = ANY(p_module_ids)
$$;

COMMIT;
