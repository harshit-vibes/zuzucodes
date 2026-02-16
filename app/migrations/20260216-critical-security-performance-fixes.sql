-- Critical Security & Performance Fixes
-- Date: 2026-02-16
-- Based on: Code Quality Audit (Vercel React & Supabase Postgres Best Practices)
--
-- CRITICAL FIXES:
-- 1. Remove NULL check in RLS policy that allows unauthenticated access
-- 2. Add compound indexes for performance
-- 3. Add CHECK constraints for data validation
-- 4. Enable RLS on Auth.js tables (if they exist)

-- =====================================================
-- CRITICAL SECURITY FIX #1: Fix RLS Policy on user_progress
-- =====================================================

-- Drop the vulnerable policy that allows NULL app.current_user_id
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;

-- Recreate the policy WITHOUT the NULL check
CREATE POLICY "Users can view their own progress"
  ON user_progress FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

-- =====================================================
-- CRITICAL PERFORMANCE FIX #2: Add Compound Indexes
-- =====================================================

-- Compound index for common query pattern (user_id, module_id, section_index)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module_section
  ON user_progress(user_id, module_id, section_index);

-- Index for quiz score queries (only where score_percent exists)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module_score
  ON user_progress(user_id, module_id, score_percent)
  WHERE score_percent IS NOT NULL;

-- Index for quiz completion queries (section_index IS NULL means quiz)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module_quiz
  ON user_progress(user_id, module_id, passed)
  WHERE section_index IS NULL;

-- =====================================================
-- DATA INTEGRITY FIX #3: Add CHECK Constraints
-- =====================================================

-- Ensure score_percent is between 0 and 100
ALTER TABLE user_progress
  ADD CONSTRAINT check_score_percent_range
  CHECK (score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100));

-- Ensure quiz records have score_percent and passed fields
ALTER TABLE user_progress
  ADD CONSTRAINT check_quiz_completeness
  CHECK (
    (section_index IS NULL AND score_percent IS NOT NULL AND passed IS NOT NULL) OR
    (section_index IS NOT NULL)
  );

-- Ensure lesson records don't have quiz fields
ALTER TABLE user_progress
  ADD CONSTRAINT check_lesson_no_quiz_fields
  CHECK (
    (section_index IS NOT NULL AND score_percent IS NULL AND passed IS NULL) OR
    (section_index IS NULL)
  );

-- =====================================================
-- SECURITY FIX #4: Enable RLS on Auth.js Tables
-- =====================================================

-- Note: Auth.js tables are in a separate schema, but if they exist in public schema:
-- Enable RLS on Auth.js tables if they exist
DO $$
BEGIN
  -- Check if accounts table exists and enable RLS
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
    ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if any
    DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;

    -- Create policy
    CREATE POLICY "Users can view their own accounts"
      ON accounts FOR SELECT
      USING ("userId" = current_setting('app.current_user_id', true));
  END IF;

  -- Check if sessions table exists and enable RLS
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if any
    DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;

    -- Create policy
    CREATE POLICY "Users can view their own sessions"
      ON sessions FOR SELECT
      USING ("userId" = current_setting('app.current_user_id', true));
  END IF;

  -- Check if verification_token table exists and enable RLS
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_token') THEN
    ALTER TABLE verification_token ENABLE ROW LEVEL SECURITY;

    -- This table doesn't have userId, so we make it fully restricted
    -- Only the app backend should access this table
    DROP POLICY IF EXISTS "Restrict verification token access" ON verification_token;

    CREATE POLICY "Restrict verification token access"
      ON verification_token FOR SELECT
      USING (false); -- No direct access allowed
  END IF;
END $$;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON INDEX idx_user_progress_user_module_section IS
  'Compound index for efficient progress lookups by user, module, and section';

COMMENT ON INDEX idx_user_progress_user_module_score IS
  'Partial index for quiz score queries (where score_percent is not null)';

COMMENT ON INDEX idx_user_progress_user_module_quiz IS
  'Partial index for quiz completion queries (where section_index is null)';
