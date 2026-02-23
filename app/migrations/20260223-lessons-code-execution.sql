-- =====================================================
-- Migration: Lessons table, progress normalization, code execution
-- Date: 2026-02-23
--
-- Changes:
--   1. Rename modules.section_count → lesson_count
--   2. Create lessons table (migrate mdx_content sections)
--   3. Create user_lesson_progress (replaces lesson rows in user_progress)
--   4. Create user_quiz_attempts (replaces quiz rows in user_progress)
--   5. Create user_code (new: persists Python code per lesson)
--   6. Drop user_progress (0 rows, safe to drop)
--   7. Update all DB functions to use new tables
--   8. Make modules.mdx_content nullable
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Rename section_count → lesson_count
-- =====================================================
ALTER TABLE modules RENAME COLUMN section_count TO lesson_count;


-- =====================================================
-- 2. Create lessons table
-- =====================================================
CREATE TABLE lessons (
  id           TEXT        PRIMARY KEY,
  module_id    TEXT        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_index INTEGER     NOT NULL,
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  code_template TEXT,                     -- NULL = no code editor for this lesson
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, lesson_index)
);

CREATE INDEX idx_lessons_module_id    ON lessons(module_id);
CREATE INDEX idx_lessons_module_lesson ON lessons(module_id, lesson_index);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons are publicly readable"
  ON lessons FOR SELECT USING (true);

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 3. Migrate mdx_content sections → lessons rows
-- =====================================================
DO $$
DECLARE
  mod            RECORD;
  sections       TEXT[];
  section_content TEXT;
  i              INTEGER;
  section_title  TEXT;
  title_line     TEXT;
  lesson_id      TEXT;
BEGIN
  FOR mod IN
    SELECT id, mdx_content FROM modules WHERE mdx_content IS NOT NULL
  LOOP
    sections := string_to_array(mod.mdx_content, E'\n---\n');

    FOR i IN 1..array_length(sections, 1) LOOP
      section_content := trim(sections[i]);

      -- Extract title from first heading line (# or ##)
      SELECT line INTO title_line
      FROM unnest(string_to_array(section_content, E'\n')) AS line
      WHERE line ~ '^#{1,3} '
      LIMIT 1;

      section_title := COALESCE(
        regexp_replace(title_line, '^#{1,6}\s+', ''),
        'Lesson ' || i
      );

      -- ID convention: lesson-{moduleId}-{0-based index, padded to 2 digits}
      lesson_id := 'lesson-' || mod.id || '-' || lpad((i - 1)::TEXT, 2, '0');

      INSERT INTO lessons (id, module_id, lesson_index, title, content)
      VALUES (lesson_id, mod.id, i - 1, section_title, section_content)
      ON CONFLICT (module_id, lesson_index) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;


-- =====================================================
-- 4. Create user_lesson_progress
-- =====================================================
CREATE TABLE user_lesson_progress (
  user_id      TEXT        NOT NULL,
  lesson_id    TEXT        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_user_lesson_progress_user   ON user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson ON user_lesson_progress(lesson_id);

ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson progress"
  ON user_lesson_progress
  USING     (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));


-- =====================================================
-- 5. Create user_quiz_attempts
-- =====================================================
CREATE TABLE user_quiz_attempts (
  id            SERIAL      PRIMARY KEY,
  user_id       TEXT        NOT NULL,
  module_id     TEXT        NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score_percent INTEGER     NOT NULL,
  passed        BOOLEAN     NOT NULL,
  answers       JSONB,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_quiz_attempts_user_module ON user_quiz_attempts(user_id, module_id);

ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quiz attempts"
  ON user_quiz_attempts
  USING     (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));


-- =====================================================
-- 6. Create user_code
-- =====================================================
CREATE TABLE user_code (
  user_id    TEXT        NOT NULL,
  lesson_id  TEXT        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX idx_user_code_user_id ON user_code(user_id);

ALTER TABLE user_code ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code"
  ON user_code
  USING     (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE TRIGGER update_user_code_updated_at
  BEFORE UPDATE ON user_code
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 7. Drop user_progress (confirmed 0 rows)
-- =====================================================
DROP TABLE user_progress;


-- =====================================================
-- 8. Update DB functions
-- =====================================================
DROP FUNCTION IF EXISTS get_batch_course_progress(text, text[]);
DROP FUNCTION IF EXISTS get_batch_module_completion_status(text, text[]);
DROP FUNCTION IF EXISTS get_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_resume_data(text);
DROP FUNCTION IF EXISTS get_section_completion_status(text, jsonb);

-- get_batch_course_progress
CREATE OR REPLACE FUNCTION public.get_batch_course_progress(p_user_id text, p_course_ids text[])
RETURNS TABLE(course_id text, progress_percent integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH course_modules AS (
    SELECT m.course_id, m.id AS module_id,
      CASE WHEN m.quiz_form IS NOT NULL THEN 1 ELSE 0 END AS has_quiz
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
      SUM(COALESCE(lc.cnt, 0) + cm.has_quiz) AS total_count
    FROM course_modules cm
    LEFT JOIN lesson_counts lc ON lc.module_id = cm.module_id
    GROUP BY cm.course_id
  ),
  completed_lessons AS (
    SELECT cm.course_id, COUNT(*) AS completed_count
    FROM course_modules cm
    JOIN lessons l ON l.module_id = cm.module_id
    JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = p_user_id
    GROUP BY cm.course_id
  ),
  passed_quizzes AS (
    SELECT cm.course_id, COUNT(DISTINCT uqa.module_id) AS quiz_count
    FROM course_modules cm
    JOIN user_quiz_attempts uqa
      ON uqa.module_id = cm.module_id AND uqa.user_id = p_user_id AND uqa.passed = true
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

-- get_batch_module_completion_status
CREATE OR REPLACE FUNCTION public.get_batch_module_completion_status(p_user_id text, p_module_ids text[])
RETURNS TABLE(module_id text, all_lessons_completed boolean, quiz_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS module_id,
    COALESCE(
      (SELECT COUNT(*) FROM user_lesson_progress ulp
       JOIN lessons l ON l.id = ulp.lesson_id
       WHERE ulp.user_id = p_user_id AND l.module_id = m.id)
      >=
      (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id),
      false
    ) AS all_lessons_completed,
    COALESCE(
      (SELECT EXISTS (
        SELECT 1 FROM user_quiz_attempts uqa
        WHERE uqa.user_id = p_user_id AND uqa.module_id = m.id AND uqa.passed = true
      )),
      false
    ) AS quiz_completed
  FROM modules m WHERE m.id = ANY(p_module_ids);
END;
$$;

-- get_dashboard_stats
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
          JOIN user_lesson_progress ulp ON ulp.lesson_id = l2.id AND ulp.user_id = p_user_id
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

-- get_resume_data
CREATE OR REPLACE FUNCTION public.get_resume_data(p_user_id text)
RETURNS TABLE(course_id text, course_title text, module_id text, module_title text, last_accessed timestamp with time zone)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.title, m.id, m.title, MAX(activity.activity_time) AS last_accessed
  FROM courses c
  JOIN modules m ON m.course_id = c.id
  JOIN (
    SELECT l.module_id, ulp.completed_at AS activity_time
    FROM user_lesson_progress ulp
    JOIN lessons l ON l.id = ulp.lesson_id
    WHERE ulp.user_id = p_user_id
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

-- get_section_completion_status (keep name for app compatibility, uses new tables)
CREATE OR REPLACE FUNCTION public.get_section_completion_status(p_user_id text, p_modules jsonb)
RETURNS TABLE(module_id text, section_index integer, is_completed boolean)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    (module_data->>'module_id')::TEXT    AS module_id,
    (module_data->>'section_index')::INTEGER AS section_index,
    EXISTS (
      SELECT 1 FROM user_lesson_progress ulp
      JOIN lessons l ON l.id = ulp.lesson_id
      WHERE ulp.user_id = p_user_id
        AND l.module_id   = (module_data->>'module_id')
        AND l.lesson_index = (module_data->>'section_index')::INTEGER
    ) AS is_completed
  FROM jsonb_array_elements(p_modules) AS module_data;
END;
$$;


-- =====================================================
-- 9. Make mdx_content nullable (content now lives in lessons)
-- =====================================================
ALTER TABLE modules ALTER COLUMN mdx_content DROP NOT NULL;

COMMIT;
