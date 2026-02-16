-- Schema for zuzu.codes with Neon Auth
-- Neon Auth handles users, sessions, and accounts in the neon_auth schema
-- This migration creates application-specific tables

-- =====================================================
-- Core Application Tables
-- =====================================================

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  outcomes TEXT[],
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modules table with MDX content and quiz form
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  mdx_content TEXT NOT NULL,
  quiz_form JSONB,
  section_count INTEGER NOT NULL DEFAULT 3,
  schema_version INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- User progress tracking
-- References neon_auth.user instead of creating a separate users table
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL, -- References neon_auth.user(id) but no FK constraint due to cross-schema
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_index INTEGER, -- NULL for quiz attempts, 0-based index for lessons
  score_percent INTEGER, -- NULL for lessons, 0-100 for quizzes
  passed BOOLEAN, -- NULL for lessons, true/false for quizzes
  answers JSONB, -- Store quiz answers for review
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id, section_index)
);

-- Module schema validation rules
CREATE TABLE IF NOT EXISTS module_schema (
  version INTEGER PRIMARY KEY,
  schema_definition JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_order ON courses("order");
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules("order");
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_schema_version ON module_schema(version) WHERE is_active = true;

-- =====================================================
-- Functions
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_schema_updated_at
  BEFORE UPDATE ON module_schema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get dashboard stats for a user
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id TEXT)
RETURNS TABLE (
  streak INTEGER,
  courses_in_progress INTEGER,
  courses_total INTEGER,
  quiz_average INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH course_stats AS (
    SELECT
      COUNT(DISTINCT c.id) as total_courses,
      COUNT(DISTINCT CASE
        WHEN up.id IS NOT NULL AND up.completed_at IS NULL
        THEN c.id
      END) as in_progress_courses
    FROM courses c
    LEFT JOIN modules m ON m.course_id = c.id
    LEFT JOIN user_progress up ON up.module_id = m.id AND up.user_id = p_user_id
  ),
  quiz_stats AS (
    SELECT
      ROUND(AVG(score_percent))::INTEGER as avg_score
    FROM user_progress
    WHERE user_id = p_user_id
      AND section_index IS NULL
      AND score_percent IS NOT NULL
  )
  SELECT
    0 as streak, -- TODO: Calculate actual streak
    cs.in_progress_courses::INTEGER,
    cs.total_courses::INTEGER,
    COALESCE(qs.avg_score, 0)::INTEGER
  FROM course_stats cs
  CROSS JOIN quiz_stats qs;
END;
$$ LANGUAGE plpgsql;

-- Function to get resume data (last accessed module)
CREATE OR REPLACE FUNCTION get_resume_data(p_user_id TEXT)
RETURNS TABLE (
  course_id TEXT,
  course_title TEXT,
  module_id TEXT,
  module_title TEXT,
  last_accessed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    m.id,
    m.title,
    MAX(up.updated_at) as last_accessed
  FROM courses c
  JOIN modules m ON m.course_id = c.id
  JOIN user_progress up ON up.module_id = m.id
  WHERE up.user_id = p_user_id
  GROUP BY c.id, c.title, m.id, m.title
  ORDER BY last_accessed DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch course progress
CREATE OR REPLACE FUNCTION get_batch_course_progress(
  p_user_id TEXT,
  p_course_ids TEXT[]
)
RETURNS TABLE (
  course_id TEXT,
  progress_percent INTEGER,
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
      WHEN t.total_count > 0 THEN ROUND((COALESCE(c.completed_count, 0)::NUMERIC / t.total_count) * 100)::INTEGER
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

-- Function to get section completion status
CREATE OR REPLACE FUNCTION get_section_completion_status(
  p_user_id TEXT,
  p_modules JSONB
)
RETURNS TABLE (
  module_id TEXT,
  section_index INTEGER,
  is_completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    module_data->>'module_id' as module_id,
    (module_data->>'section_index')::INTEGER as section_index,
    EXISTS (
      SELECT 1
      FROM user_progress up
      WHERE up.user_id = p_user_id
        AND up.module_id = module_data->>'module_id'
        AND up.section_index = (module_data->>'section_index')::INTEGER
        AND up.score_percent IS NULL
    ) as is_completed
  FROM jsonb_array_elements(p_modules) as module_data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_schema ENABLE ROW LEVEL SECURITY;

-- Courses: Public read access
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Modules: Public read access
CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  USING (true);

-- Module schema: Public read access
CREATE POLICY "Anyone can view module schemas"
  ON module_schema FOR SELECT
  USING (true);

-- User progress: Users can only see/modify their own progress
-- Note: We use current_setting to get user_id from app context
-- The application sets this via: SET LOCAL app.current_user_id = 'user_id';

CREATE POLICY "Users can view their own progress"
  ON user_progress FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_id', true) IS NULL
  );

CREATE POLICY "Users can insert their own progress"
  ON user_progress FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own progress"
  ON user_progress FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own progress"
  ON user_progress FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true));

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE courses IS 'Course catalog - publicly readable';
COMMENT ON TABLE modules IS 'Course modules with MDX content and optional quiz';
COMMENT ON TABLE user_progress IS 'Tracks user progress through lessons and quizzes';
COMMENT ON TABLE module_schema IS 'Schema validation rules for module content';

COMMENT ON FUNCTION get_dashboard_stats IS 'Get dashboard statistics for a user';
COMMENT ON FUNCTION get_resume_data IS 'Get last accessed module for resume learning';
COMMENT ON FUNCTION get_batch_course_progress IS 'Get progress for multiple courses';
COMMENT ON FUNCTION get_batch_module_completion_status IS 'Get completion status for multiple modules';
COMMENT ON FUNCTION get_section_completion_status IS 'Get completion status for specific sections';
