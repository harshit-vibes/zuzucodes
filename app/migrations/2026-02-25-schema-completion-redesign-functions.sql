-- Migration: Update all progress DB functions to use user_code.passed_at
-- Date: 2026-02-25

BEGIN;

-- ─── get_batch_course_progress ───────────────────────────────────────────────
-- Changes:
--   • completed_lessons CTE: join user_code WHERE passed_at IS NOT NULL
--   • total_items CTE: quiz always counts (+1), removes has_quiz conditional
CREATE OR REPLACE FUNCTION public.get_batch_course_progress(p_user_id text, p_course_ids text[])
RETURNS TABLE(course_id text, progress_percent integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH course_modules AS (
    SELECT m.course_id, m.id AS module_id
    FROM modules m WHERE m.course_id = ANY(p_course_ids)
  ),
  lesson_counts AS (
    SELECT l.module_id, COUNT(*) AS cnt
    FROM lessons l
    WHERE l.module_id IN (SELECT module_id FROM course_modules)
    GROUP BY l.module_id
  ),
  total_items AS (
    SELECT cm.course_id,
      SUM(COALESCE(lc.cnt, 0) + 1) AS total_count  -- +1: quiz always mandatory
    FROM course_modules cm
    LEFT JOIN lesson_counts lc ON lc.module_id = cm.module_id
    GROUP BY cm.course_id
  ),
  completed_lessons AS (
    SELECT cm.course_id, COUNT(*) AS completed_count
    FROM course_modules cm
    JOIN lessons l ON l.module_id = cm.module_id
    JOIN user_code uc ON uc.lesson_id = l.id
      AND uc.user_id = p_user_id
      AND uc.passed_at IS NOT NULL
    GROUP BY cm.course_id
  ),
  passed_quizzes AS (
    SELECT cm.course_id, COUNT(DISTINCT uqa.module_id) AS quiz_count
    FROM course_modules cm
    JOIN user_quiz_attempts uqa
      ON uqa.module_id = cm.module_id
      AND uqa.user_id = p_user_id
      AND uqa.passed = true
    GROUP BY cm.course_id
  )
  SELECT
    t.course_id,
    CASE WHEN t.total_count > 0
      THEN ROUND(
        (COALESCE(cl.completed_count, 0) + COALESCE(pq.quiz_count, 0))::NUMERIC
        / t.total_count * 100
      )::INTEGER
      ELSE 0
    END AS progress_percent,
    (COALESCE(cl.completed_count, 0) + COALESCE(pq.quiz_count, 0)) >= t.total_count
      AS is_completed
  FROM total_items t
  LEFT JOIN completed_lessons cl ON cl.course_id = t.course_id
  LEFT JOIN passed_quizzes    pq ON pq.course_id = t.course_id;
END;
$$;

-- ─── get_batch_module_completion_status ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_batch_module_completion_status(p_user_id text, p_module_ids text[])
RETURNS TABLE(module_id text, all_lessons_completed boolean, quiz_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS module_id,
    COALESCE(
      (SELECT COUNT(*) FROM user_code uc
       JOIN lessons l ON l.id = uc.lesson_id
       WHERE uc.user_id = p_user_id
         AND l.module_id = m.id
         AND uc.passed_at IS NOT NULL)
      >=
      (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id),
      false
    ) AS all_lessons_completed,
    COALESCE(
      (SELECT EXISTS (
        SELECT 1 FROM user_quiz_attempts uqa
        WHERE uqa.user_id = p_user_id
          AND uqa.module_id = m.id
          AND uqa.passed = true
      )),
      false
    ) AS quiz_completed
  FROM modules m WHERE m.id = ANY(p_module_ids);
END;
$$;

-- ─── get_dashboard_stats ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id text)
RETURNS TABLE(streak integer, courses_in_progress integer, courses_total integer, quiz_average integer)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      COUNT(DISTINCT c.id) AS total_courses,
      COUNT(DISTINCT CASE
        WHEN EXISTS (
          SELECT 1 FROM modules m2
          JOIN lessons l2 ON l2.module_id = m2.id
          JOIN user_code uc ON uc.lesson_id = l2.id
            AND uc.user_id = p_user_id
            AND uc.passed_at IS NOT NULL
          WHERE m2.course_id = c.id
        ) THEN c.id
      END) AS in_progress_courses
    FROM courses c
  ),
  quiz_stats AS (
    SELECT ROUND(AVG(score_percent))::INTEGER AS avg_score
    FROM user_quiz_attempts
    WHERE user_id = p_user_id
  )
  SELECT
    0 AS streak,
    cs.in_progress_courses::INTEGER,
    cs.total_courses::INTEGER,
    COALESCE(qs.avg_score, 0)::INTEGER
  FROM course_stats cs CROSS JOIN quiz_stats qs;
END;
$$;

-- ─── get_resume_data ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_resume_data(p_user_id text)
RETURNS TABLE(course_id text, course_title text, module_id text, module_title text, last_accessed timestamp with time zone)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title, m.id, m.title, MAX(activity.activity_time) AS last_accessed
  FROM courses c
  JOIN modules m ON m.course_id = c.id
  JOIN (
    SELECT l.module_id, uc.passed_at AS activity_time
    FROM user_code uc
    JOIN lessons l ON l.id = uc.lesson_id
    WHERE uc.user_id = p_user_id AND uc.passed_at IS NOT NULL
    UNION ALL
    SELECT uqa.module_id, uqa.attempted_at AS activity_time
    FROM user_quiz_attempts uqa
    WHERE uqa.user_id = p_user_id
  ) activity ON activity.module_id = m.id
  GROUP BY c.id, c.title, m.id, m.title
  ORDER BY last_accessed DESC
  LIMIT 1;
END;
$$;

-- ─── get_section_completion_status ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_section_completion_status(p_user_id text, p_modules jsonb)
RETURNS TABLE(module_id text, section_index integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    (module_data->>'module_id')::TEXT         AS module_id,
    (module_data->>'section_index')::INTEGER  AS section_index,
    EXISTS (
      SELECT 1 FROM user_code uc
      JOIN lessons l ON l.id = uc.lesson_id
      WHERE uc.user_id = p_user_id
        AND uc.passed_at IS NOT NULL
        AND l.module_id    = (module_data->>'module_id')
        AND l.lesson_index = (module_data->>'section_index')::INTEGER
    ) AS is_completed
  FROM jsonb_array_elements(p_modules) AS module_data;
END;
$$;

COMMIT;
