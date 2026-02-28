// app/scripts/create-course/types.ts
import type { TemplateContent } from '../../src/lib/templates/types';

// ── Quiz ───────────────────────────────────────────────────────────────────────
export interface QuizOption {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
}

export interface QuizQuestion {
  id: string;
  statement: string;
  options: QuizOption[];
  correctOption: 'a' | 'b' | 'c' | 'd';
  explanation: string;
}

export interface QuizForm {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

// ── Confidence form ────────────────────────────────────────────────────────────
export interface ConfidenceQuestion {
  id: string;
  statement: string;
}

export interface ConfidenceForm {
  title: string;
  questions: ConfidenceQuestion[];
}

// ── Test cases ─────────────────────────────────────────────────────────────────
export interface TestCaseJson {
  id: string;
  position: number;
  description: string;
  args: unknown[];
  expected: unknown;
  visible: boolean;
}

// ── Lesson ─────────────────────────────────────────────────────────────────────
// _status values:
//   'pending'          — not yet generated
//   'content-complete' — Lesson Content Agent done; Code Challenge Agent not yet run
//   'verify-failed'    — Code Challenge Agent ran but executor verification failed after 3 retries
//   'complete'         — all fields populated, executor verified, human approved
//   'todo'             — skipped by user (seeder skips these)
export type UnitStatus = 'pending' | 'content-complete' | 'verify-failed' | 'complete' | 'todo';

export interface LessonJson {
  id: string;
  lesson_index: number;
  title: string;
  content: string;
  code_template: string;
  solution_code: string;
  entry_point: string;
  problem_summary: string;
  problem_constraints: string[];
  problem_hints: string[];
  intro_content: TemplateContent<'lesson-intro'>;
  outro_content: TemplateContent<'lesson-outro'>;
  test_cases: TestCaseJson[];
  _status: UnitStatus;
}

// ── Module ─────────────────────────────────────────────────────────────────────
export interface ModuleJson {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  lesson_count: number;
  quiz_form: QuizForm | null;   // null until Quiz Agent runs
  intro_content: TemplateContent<'module-intro'>;
  outro_content: TemplateContent<'module-outro'>;
  _status: UnitStatus;
}

// ── Course ─────────────────────────────────────────────────────────────────────
export interface CourseJson {
  id: string;
  title: string;
  slug: string;
  description: string;
  outcomes: string[];
  tag: string;
  order: number;
  intro_content: TemplateContent<'course-intro'> | null;    // null until Course Content Agent runs
  outro_content: TemplateContent<'course-outro'> | null;
  confidence_form: ConfidenceForm | null;
  _status: UnitStatus;
}

// ── Course outline (orchestration state) ───────────────────────────────────────
export interface OutlineLesson {
  title: string;
  slug: string;
  objectives: string[];
}

export interface OutlineModule {
  title: string;
  slug: string;
  lessons: OutlineLesson[];
}

export interface CourseOutline {
  title: string;
  slug: string;
  tag: string;
  outcomes: string[];
  who_is_this_for: string;
  modules: OutlineModule[];
  // Keys: 'course', 'module:{slug}', 'lesson:{module-slug}:{lesson-index}'
  // 'quiz:{module-slug}', 'course-content'
  status: Record<string, UnitStatus>;
}
