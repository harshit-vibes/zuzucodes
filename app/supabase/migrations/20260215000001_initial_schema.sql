-- Initial schema for zuzu.codes
-- Single-tenant course platform with Supabase Auth

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Core Tables
-- =====================================================

-- Users table (synced with auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table
CREATE TABLE public.courses (
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
CREATE TABLE public.modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  mdx_content TEXT NOT NULL,
  quiz_form JSONB,
  section_count INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- User progress tracking
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  -- Lesson progress (which sections completed)
  completed_sections INTEGER[] NOT NULL DEFAULT '{}',
  -- Quiz attempts
  quiz_attempts JSONB[] NOT NULL DEFAULT '{}',
  best_quiz_score INTEGER,
  quiz_passed BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Module schema validation rules
CREATE TABLE public.module_schema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'theory', 'demo', 'practical'
  section_order INTEGER NOT NULL,
  validation_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, section_order)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_courses_slug ON public.courses(slug);
CREATE INDEX idx_courses_order ON public.courses("order");
CREATE INDEX idx_modules_course_id ON public.modules(course_id);
CREATE INDEX idx_modules_order ON public.modules("order");
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_module_id ON public.user_progress(module_id);
CREATE INDEX idx_module_schema_module_id ON public.module_schema(module_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_schema ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Courses table policies (public read)
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

-- Modules table policies (public read)
CREATE POLICY "Anyone can view modules"
  ON public.modules FOR SELECT
  USING (true);

-- Module schema policies (public read)
CREATE POLICY "Anyone can view module schemas"
  ON public.module_schema FOR SELECT
  USING (true);

-- User progress policies (own data only)
CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- Functions
-- =====================================================

-- Function to calculate course progress
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_course_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
BEGIN
  -- Count total modules in course
  SELECT COUNT(*) INTO total_modules
  FROM public.modules
  WHERE course_id = p_course_id;

  -- Count completed modules (where completed_at is set)
  SELECT COUNT(*) INTO completed_modules
  FROM public.user_progress up
  JOIN public.modules m ON up.module_id = m.id
  WHERE up.user_id = p_user_id
    AND m.course_id = p_course_id
    AND up.completed_at IS NOT NULL;

  -- Return percentage
  IF total_modules = 0 THEN
    RETURN 0;
  ELSE
    RETURN ROUND((completed_modules::DECIMAL / total_modules) * 100);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's modules with progress
CREATE OR REPLACE FUNCTION get_modules_with_progress(p_user_id UUID, p_course_id TEXT)
RETURNS TABLE (
  id TEXT,
  course_id TEXT,
  title TEXT,
  slug TEXT,
  description TEXT,
  "order" INTEGER,
  mdx_content TEXT,
  quiz_form JSONB,
  section_count INTEGER,
  completed_sections INTEGER[],
  quiz_attempts JSONB[],
  best_quiz_score INTEGER,
  quiz_passed BOOLEAN,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.course_id,
    m.title,
    m.slug,
    m.description,
    m."order",
    m.mdx_content,
    m.quiz_form,
    m.section_count,
    COALESCE(up.completed_sections, '{}'),
    COALESCE(up.quiz_attempts, '{}'),
    up.best_quiz_score,
    COALESCE(up.quiz_passed, false),
    up.started_at,
    up.completed_at
  FROM public.modules m
  LEFT JOIN public.user_progress up ON m.id = up.module_id AND up.user_id = p_user_id
  WHERE m.course_id = p_course_id
  ORDER BY m."order";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update module progress
CREATE OR REPLACE FUNCTION update_module_progress(
  p_user_id UUID,
  p_module_id TEXT,
  p_section_number INTEGER DEFAULT NULL,
  p_quiz_attempt JSONB DEFAULT NULL
)
RETURNS public.user_progress AS $$
DECLARE
  v_progress public.user_progress;
  v_section_count INTEGER;
  v_new_sections INTEGER[];
BEGIN
  -- Get module section count
  SELECT section_count INTO v_section_count
  FROM public.modules
  WHERE id = p_module_id;

  -- Insert or get existing progress
  INSERT INTO public.user_progress (user_id, module_id)
  VALUES (p_user_id, p_module_id)
  ON CONFLICT (user_id, module_id) DO NOTHING;

  -- Update section completion
  IF p_section_number IS NOT NULL THEN
    UPDATE public.user_progress
    SET
      completed_sections = array_append(
        CASE
          WHEN p_section_number = ANY(completed_sections) THEN completed_sections
          ELSE completed_sections
        END,
        p_section_number
      ),
      updated_at = NOW()
    WHERE user_id = p_user_id AND module_id = p_module_id
    RETURNING * INTO v_progress;
  END IF;

  -- Update quiz attempt
  IF p_quiz_attempt IS NOT NULL THEN
    UPDATE public.user_progress
    SET
      quiz_attempts = array_append(quiz_attempts, p_quiz_attempt),
      best_quiz_score = GREATEST(
        COALESCE(best_quiz_score, 0),
        (p_quiz_attempt->>'score')::INTEGER
      ),
      quiz_passed = CASE
        WHEN (p_quiz_attempt->>'score')::INTEGER >= 70 THEN true
        ELSE quiz_passed
      END,
      updated_at = NOW()
    WHERE user_id = p_user_id AND module_id = p_module_id
    RETURNING * INTO v_progress;
  END IF;

  -- Check if module is completed (all sections done + quiz passed)
  SELECT * INTO v_progress
  FROM public.user_progress
  WHERE user_id = p_user_id AND module_id = p_module_id;

  IF array_length(v_progress.completed_sections, 1) >= v_section_count
     AND v_progress.quiz_passed
     AND v_progress.completed_at IS NULL THEN
    UPDATE public.user_progress
    SET completed_at = NOW()
    WHERE user_id = p_user_id AND module_id = p_module_id
    RETURNING * INTO v_progress;
  END IF;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create user profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.users IS 'User profiles synced with Supabase Auth';
COMMENT ON TABLE public.courses IS 'Course catalog';
COMMENT ON TABLE public.modules IS 'Course modules with MDX content and embedded quiz';
COMMENT ON TABLE public.user_progress IS 'Tracks user progress through modules including section completion and quiz attempts';
COMMENT ON TABLE public.module_schema IS 'Validation rules for module content structure';

COMMENT ON FUNCTION get_course_progress IS 'Calculate completion percentage for a course';
COMMENT ON FUNCTION get_modules_with_progress IS 'Get all modules for a course with user progress';
COMMENT ON FUNCTION update_module_progress IS 'Update user progress for a module (section or quiz)';
