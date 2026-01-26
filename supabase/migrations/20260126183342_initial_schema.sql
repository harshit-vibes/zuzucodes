-- ========================================
-- ZUZUCODES COURSE PLATFORM SCHEMA
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- CONTENT TABLES
-- ========================================

-- Courses
create table courses (
  id text primary key,
  title text not null,
  description text,
  thumbnail_url text,
  author_name text,
  category text,
  duration text,
  level text,
  prerequisites text[],
  outcomes text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Modules
create table modules (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  title text not null,
  description text,
  "order" integer not null,
  lesson_count integer,
  duration text,
  outcomes text[],
  prerequisites text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lessons
create table lessons (
  id text primary key,
  title text not null,
  markdown_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Quizzes
create table quizzes (
  id text primary key,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Module Items (polymorphic link to lesson or quiz)
create table module_items (
  id text primary key,
  module_id text not null references modules(id) on delete cascade,
  "order" integer not null,
  item_type text not null check (item_type in ('lesson', 'quiz')),
  lesson_id text references lessons(id) on delete cascade,
  quiz_id text references quizzes(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint module_items_type_check check (
    (item_type = 'lesson' and lesson_id is not null and quiz_id is null) or
    (item_type = 'quiz' and quiz_id is not null and lesson_id is null)
  )
);

-- Questions (for quizzes)
create table questions (
  id text primary key,
  quiz_id text not null references quizzes(id) on delete cascade,
  "order" integer not null,
  statement text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Answer Options
create table answer_options (
  id text primary key,
  question_id text not null references questions(id) on delete cascade,
  text text not null,
  hint_label text,
  is_correct boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========================================
-- INDEXES
-- ========================================

-- Foreign key indexes (critical for JOINs)
create index modules_course_id_idx on modules(course_id);
create index module_items_module_id_idx on module_items(module_id);
create index module_items_lesson_id_idx on module_items(lesson_id) where lesson_id is not null;
create index module_items_quiz_id_idx on module_items(quiz_id) where quiz_id is not null;
create index questions_quiz_id_idx on questions(quiz_id);
create index answer_options_question_id_idx on answer_options(question_id);

-- Composite indexes for ordering queries
create index modules_course_order_idx on modules(course_id, "order");
create index module_items_module_order_idx on module_items(module_id, "order");
create index questions_quiz_order_idx on questions(quiz_id, "order");

-- Full-text search on lessons
alter table lessons add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(markdown_content, ''))) stored;
create index lessons_search_idx on lessons using gin(search_vector);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table quizzes enable row level security;
alter table module_items enable row level security;
alter table questions enable row level security;
alter table answer_options enable row level security;

-- Public read access for all content
create policy "Public read" on courses for select using (true);
create policy "Public read" on modules for select using (true);
create policy "Public read" on lessons for select using (true);
create policy "Public read" on quizzes for select using (true);
create policy "Public read" on module_items for select using (true);
create policy "Public read" on questions for select using (true);
create policy "Public read" on answer_options for select using (true);
