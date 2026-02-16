-- Add missing tables and functions for zuzu.codes Neon database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_index INT, -- NULL for quiz attempts, 0-N for lessons
  score_percent INT, -- NULL for lessons, 0-100 for quizzes
  passed BOOLEAN, -- NULL for lessons, true/false for quizzes
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id, section_index)
);

-- Indexes for user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at DESC);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get batch course progress
CREATE OR REPLACE FUNCTION get_batch_course_progress(
  p_user_id TEXT,
  p_course_ids TEXT[]
)
RETURNS TABLE (
  course_id TEXT,
  progress_percent INT,
  is_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH course_modules AS (
    SELECT
      m.course_id,
      m.id as module_id,
      m.section_count,
      CASE WHEN m.quiz_form IS NOT NULL THEN 1 ELSE 0 END as has_quiz
    FROM modules m
    WHERE m.course_id = ANY(p_course_ids)
  ),
  total_items AS (
    SELECT
      course_id,
      SUM(section_count + has_quiz) as total_count
    FROM course_modules
    GROUP BY course_id
  ),
  completed_items AS (
    SELECT
      cm.course_id,
      COUNT(DISTINCT
        CASE
          WHEN up.section_index IS NOT NULL THEN cm.module_id || ':' || up.section_index
          WHEN up.section_index IS NULL AND up.passed = true THEN cm.module_id || ':quiz'
        END
      ) as completed_count
    FROM course_modules cm
    LEFT JOIN user_progress up ON
      up.user_id = p_user_id
      AND up.module_id = cm.module_id
      AND (
        (up.section_index IS NOT NULL AND up.score_percent IS NULL) OR
        (up.section_index IS NULL AND up.passed = true)
      )
    GROUP BY cm.course_id
  )
  SELECT
    t.course_id,
    CASE
      WHEN t.total_count > 0 THEN ROUND((COALESCE(c.completed_count, 0)::NUMERIC / t.total_count) * 100)::INT
      ELSE 0
    END as progress_percent,
    COALESCE(c.completed_count, 0) >= t.total_count as is_completed
  FROM total_items t
  LEFT JOIN completed_items c ON c.course_id = t.course_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch module completion status
CREATE OR REPLACE FUNCTION get_batch_module_completion_status(
  p_user_id TEXT,
  p_module_ids TEXT[]
)
RETURNS TABLE (
  module_id TEXT,
  all_lessons_completed BOOLEAN,
  quiz_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as module_id,
    COALESCE(
      (SELECT COUNT(*)
       FROM user_progress up
       WHERE up.user_id = p_user_id
         AND up.module_id = m.id
         AND up.section_index IS NOT NULL
         AND up.score_percent IS NULL) >= m.section_count,
      false
    ) as all_lessons_completed,
    COALESCE(
      (SELECT COUNT(*) > 0
       FROM user_progress up
       WHERE up.user_id = p_user_id
         AND up.module_id = m.id
         AND up.section_index IS NULL
         AND up.passed = true),
      false
    ) as quiz_completed
  FROM modules m
  WHERE m.id = ANY(p_module_ids);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read, users can manage their own data)
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true) OR current_setting('app.current_user_id', true) IS NULL);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own progress" ON user_progress
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));
