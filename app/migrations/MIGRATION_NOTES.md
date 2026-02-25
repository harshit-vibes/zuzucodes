# Neon Auth Schema Migration Notes

## Key Changes from Supabase/Auth.js Schema

### 1. **No Separate Users Table**
- ❌ **Old**: Created `public.users` table synced with `auth.users`
- ✅ **New**: Use existing `neon_auth.user` table
- **Reason**: Neon Auth manages users in its own schema

### 2. **User Foreign Keys**
- ❌ **Old**: `user_id UUID REFERENCES public.users(id)`
- ✅ **New**: `user_id TEXT` (no FK constraint due to cross-schema)
- **Reason**: Can't create FK to `neon_auth.user` from public schema
- **Note**: Application enforces referential integrity

### 3. **RLS Policies**
- ❌ **Old**: Used `auth.uid()` function from Supabase
- ✅ **New**: Use `current_setting('app.current_user_id', true)`
- **Reason**: Neon Auth doesn't provide session context in SQL
- **Implementation**: Application sets session variable per request

### 4. **No Auth.js Tables**
- ❌ **Old**: Created `verification_token`, `accounts`, `sessions` tables
- ✅ **New**: Neon Auth handles all auth tables
- **Reason**: Neon Auth has its own auth schema

### 5. **User Progress Simplification**
- **Changed**: Uses simpler `section_index` approach
- `section_index IS NULL` → Quiz attempt
- `section_index IS NOT NULL` → Lesson completion
- Added `answers` JSONB field for quiz review

## Schema Structure

```
public schema:
├── courses
│   └── modules
│       └── user_progress (user_id references neon_auth.user)
└── module_schema

neon_auth schema (managed by Neon Auth):
├── user
├── session
├── account
└── ... (other auth tables)
```

## Tables Created

### `courses`
- **Purpose**: Course catalog
- **Access**: Public read (RLS enabled)
- **Fields**: id, title, slug, description, thumbnail_url, outcomes, order

### `modules`
- **Purpose**: Course content with MDX and quizzes
- **Access**: Public read (RLS enabled)
- **Fields**: id, course_id, title, mdx_content, quiz_form, section_count, schema_version

### `user_progress`
- **Purpose**: Track lesson completions and quiz attempts
- **Access**: Users can only see/modify their own (RLS enabled)
- **Fields**: user_id, module_id, section_index, score_percent, passed, answers

### `module_schema`
- **Purpose**: Content validation rules
- **Access**: Public read (RLS enabled)
- **Fields**: version, schema_definition, is_active

## Functions Created

1. **`get_dashboard_stats(user_id)`**
   - Returns: streak, courses_in_progress, courses_total, quiz_average

2. **`get_resume_data(user_id)`**
   - Returns: Last accessed course/module for "Continue Learning"

3. **`get_batch_course_progress(user_id, course_ids[])`**
   - Returns: Progress percentage for multiple courses

4. **`get_batch_module_completion_status(user_id, module_ids[])`**
   - Returns: Lesson and quiz completion for multiple modules

5. **`get_section_completion_status(user_id, modules_json)`**
   - Returns: Completion status for specific sections

## Important Notes

### RLS Configuration
The application must set the user context for RLS to work:

```sql
SET LOCAL app.current_user_id = 'user-id-from-neon-auth';
```

This should be done at the start of each database transaction where user-specific queries are made.

### No Foreign Key to neon_auth.user
- PostgreSQL doesn't support cross-schema foreign keys easily
- The application ensures data integrity
- Consider adding a check constraint if needed

### Migration Strategy
1. Run this migration on the Neon database
2. Update application code to set `app.current_user_id` session variable
3. Test RLS policies work correctly
4. Populate initial course data

## Next Steps

1. **Apply Migration**: Run `neon-auth-schema.sql` on the database
2. **Seed Data**: Add initial courses and modules
3. **Test RLS**: Verify policies work with session variables
4. **Update App**: Ensure all queries set the user context

---

## Current Schema State (as of 2026-02-25)

`user_lesson_progress` has been **dropped**. Lesson completion is now tracked exclusively via `user_code.passed_at`.

### `user_code` table (current columns)

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | TEXT | References neon_auth user |
| `lesson_id` | TEXT | References lessons.id |
| `code` | TEXT | User's latest saved code |
| `last_test_results` | JSONB | Persisted test-case results from last run |
| `passed_at` | TIMESTAMPTZ | Set when all tests pass; NULL if not yet passed |
| `updated_at` | TIMESTAMPTZ | Last save timestamp |

### `modules` table constraint

`quiz_form` is now `NOT NULL` (enforced by CHECK constraint added in `2026-02-25-mandatory-quiz-constraint.sql`).

---

## Migration Order — 2026-02-25 Batch

Run these four migrations **in order** against the Neon database:

1. **`2026-02-25-lesson-player-ux.sql`**
   - Adds `lessons.problem` JSONB column (problem statement + examples for the code editor)
   - Adds `user_code.last_test_results` JSONB column (persists test results across sessions)

2. **`2026-02-25-schema-completion-redesign.sql`**
   - Adds `user_code.passed_at` TIMESTAMPTZ column
   - Migrates existing completion data from `user_lesson_progress` into `user_code.passed_at`
   - Drops the `user_lesson_progress` table

3. **`2026-02-25-schema-completion-redesign-functions.sql`**
   - Rewrites 5 DB functions to use `user_code.passed_at` instead of `user_lesson_progress`:
     - `get_batch_course_progress`
     - `get_batch_module_completion_status` (includes empty-module guard: `COUNT(*) > 0 AND ...`)
     - `get_dashboard_stats`
     - `get_resume_data`
     - `get_section_completion_status`

4. **`2026-02-25-mandatory-quiz-constraint.sql`**
   - Adds `CHECK (quiz_form IS NOT NULL)` constraint on the `modules` table
   - **Prerequisites**: Before running, verify no modules have a NULL `quiz_form`:
     ```sql
     SELECT id, title FROM modules WHERE quiz_form IS NULL;
     ```
   - Run this migration **only after** the above query returns 0 rows.
