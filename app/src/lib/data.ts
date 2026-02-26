/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Data layer for zuzu.codes
 * Uses Neon database with raw SQL queries via @neondatabase/serverless
 */

import { cache } from 'react';
import { sql } from '@/lib/neon';
import type { TestCase } from '@/lib/judge0';

// ========================================
// TYPES
// ========================================

export interface CourseForm {
  title: string;
  questions: {
    id: string;
    statement: string;
    options: { id: string; text: string }[];
  }[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  outcomes: string[] | null;
  tag: string | null;
  order: number;
  intro_content: unknown | null;
  outro_content: unknown | null;
  onboarding_form: CourseForm | null;
  completion_form: CourseForm | null;
}

export interface QuizQuestion {
  id: string;
  statement: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string | null;
}

export interface QuizForm {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface Module {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  quiz_form: QuizForm | null;
  lesson_count: number;
  intro_content: unknown | null;
  outro_content: unknown | null;
}

export interface ContentItem {
  type: 'lesson' | 'quiz';
  index: number; // 0-based for lessons, -1 for quiz
  title: string;
}

export type CourseWithModules = Course & {
  modules: (Module & { contentItems: ContentItem[] })[];
};

export interface UserCode {
  code: string;
  lastTestResults: import('@/lib/judge0').TestCaseResult[] | null;
  passedAt: string | null;
}

export type SectionStatus = 'not-started' | 'in-progress' | 'completed';

// ── Template system ──────────────────────────────────────────────────────────

export interface DbLessonSection {
  id: string;
  lessonId: string;
  position: number;
  template: string;        // TemplateName — kept as string here to avoid server bundle coupling
  content: unknown;        // Validated JSONB; cast to TemplateContent<T> at render time
}

/**
 * Fetch all sections for a lesson, ordered by position.
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getLessonSections = cache(async (lessonId: string): Promise<DbLessonSection[]> => {
  try {
    const result = await sql`
      SELECT id, lesson_id, position, template, content
      FROM lesson_sections
      WHERE lesson_id = ${lessonId}
      ORDER BY position ASC
    `;
    return (result as any[]).map((row) => ({
      id: row.id,
      lessonId: row.lesson_id,
      position: row.position,
      template: row.template,
      content: row.content,
    }));
  } catch (error) {
    console.error('getLessonSections error:', error);
    return [];
  }
});

/**
 * Derive content items from module fields (lesson_count + quiz_form).
 */
function deriveContentItems(m: Module): ContentItem[] {
  const items: ContentItem[] = [];
  for (let i = 0; i < m.lesson_count; i++) {
    items.push({ type: 'lesson', index: i, title: `Lesson ${i + 1}` });
  }
  if (m.quiz_form) {
    items.push({ type: 'quiz', index: -1, title: m.quiz_form.title || 'Quiz' });
  }
  return items;
}

// ========================================
// DATA FETCHING
// ========================================

/**
 * Get all courses (public content)
 */
export async function getCourses(): Promise<Course[]> {
  try {
    const result = await sql`
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
             intro_content, outro_content, onboarding_form, completion_form, created_at
      FROM courses
      ORDER BY created_at ASC
    `;
    return result as Course[];
  } catch (error) {
    console.error('getCourses error:', error);
    return [];
  }
}

/**
 * Get course with all modules and their contents
 * Wrapped with React.cache() for per-request deduplication
 */
export const getCourseWithModules = cache(async (courseSlug: string): Promise<CourseWithModules | null> => {
  try {
    const courses = await sql`
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
             intro_content, outro_content, onboarding_form, completion_form, created_at
      FROM courses
      WHERE slug = ${courseSlug}
    `;

    if (courses.length === 0) return null;
    const course = courses[0];

    const modules = await sql`
      SELECT m.id, m.course_id, m.slug, m.title, m.description, m."order",
             m.quiz_form, m.intro_content, m.outro_content,
             COALESCE(lc.lesson_count, 0) AS lesson_count
      FROM modules m
      LEFT JOIN (
        SELECT module_id, COUNT(*)::INTEGER AS lesson_count
        FROM lessons GROUP BY module_id
      ) lc ON lc.module_id = m.id
      WHERE m.course_id = ${course.id}
      ORDER BY m."order" ASC
    `;

    return {
      ...course,
      modules: (modules as Module[]).map((m) => ({
        ...m,
        contentItems: deriveContentItems(m),
      })),
    } as CourseWithModules;
  } catch (error) {
    console.error('getCourseWithModules error:', error);
    return null;
  }
});

/**
 * Get module by ID
 * Wrapped with React.cache() for per-request deduplication
 */
export const getModule = cache(async (moduleSlug: string): Promise<Module | null> => {
  try {
    const result = await sql`
      SELECT m.id, m.course_id, m.slug, m.title, m.description, m."order",
             m.quiz_form, m.intro_content, m.outro_content,
             COALESCE(lc.lesson_count, 0) AS lesson_count
      FROM modules m
      LEFT JOIN (
        SELECT module_id, COUNT(*)::INTEGER AS lesson_count
        FROM lessons GROUP BY module_id
      ) lc ON lc.module_id = m.id
      WHERE m.slug = ${moduleSlug}
    `;

    return result.length > 0 ? (result[0] as Module) : null;
  } catch (error) {
    console.error('getModule error:', error);
    return null;
  }
});

export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;
  title: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  introContent: unknown | null;   // LessonIntroContent if present
  outroContent: unknown | null;   // LessonOutroContent if present
}

/**
 * Get lesson by module and position (1-indexed).
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getLesson = cache(async (
  moduleId: string,
  position: number
): Promise<LessonData | null> => {
  const lessonIndex = position - 1;

  try {
    const result = await sql`
      SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
             l.entry_point, l.solution_code,
             l.problem_summary, l.problem_constraints, l.problem_hints,
             l.intro_content, l.outro_content,
             COALESCE(
               (SELECT json_agg(
                  json_build_object('description', tc.description, 'args', tc.args,
                                    'expected', tc.expected, 'visible', tc.visible)
                  ORDER BY tc.position
                ) FROM test_cases tc WHERE tc.lesson_id = l.id),
               '[]'::json
             ) AS test_cases,
             m.id AS module_id, m.title AS module_title
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.module_id = ${moduleId}
        AND l.lesson_index = ${lessonIndex}
    `;

    if (result.length === 0) return null;

    const row = result[0] as any;
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      testCases: (row.test_cases as TestCase[] | null) ?? null,
      entryPoint: row.entry_point ?? null,
      solutionCode: row.solution_code ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
      problemSummary: row.problem_summary ?? null,
      problemConstraints: (row.problem_constraints as string[]) ?? [],
      problemHints: (row.problem_hints as string[]) ?? [],
      introContent: row.intro_content ?? null,
      outroContent: row.outro_content ?? null,
    };
  } catch (error) {
    console.error('getLesson error:', error);
    return null;
  }
});

/**
 * Get lesson count for a module.
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getLessonCount = cache(async (moduleId: string): Promise<number> => {
  try {
    const result = await sql`
      SELECT COUNT(*)::INTEGER AS count FROM lessons WHERE module_id = ${moduleId}
    `;
    return (result[0] as any).count ?? 0;
  } catch (error) {
    console.error('getLessonCount error:', error);
    return 0;
  }
});

/**
 * Get quiz form for a module
 */
export async function getQuiz(moduleId: string): Promise<QuizForm | null> {
  const mod = await getModule(moduleId);
  return mod?.quiz_form ?? null;
}

/**
 * Get user's saved code for a lesson
 */
export async function getUserCode(userId: string, lessonId: string): Promise<UserCode | null> {
  try {
    const result = await sql`
      SELECT code, last_test_results, passed_at FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    `;
    if (result.length === 0) return null;
    const row = result[0] as any;
    return {
      code: row.code,
      lastTestResults: (row.last_test_results as import('@/lib/judge0').TestCaseResult[] | null) ?? null,
      passedAt: row.passed_at ? (row.passed_at as Date).toISOString() : null,
    };
  } catch (error) {
    console.error('getUserCode error:', error);
    return null;
  }
}

/**
 * Batch-fetch lesson titles for a set of modules. Returns them grouped by moduleId.
 */
export async function getLessonsForCourse(
  moduleIds: string[]
): Promise<Record<string, { id: string; lesson_index: number; title: string }[]>> {
  if (moduleIds.length === 0) return {};
  try {
    const rows = await sql`
      SELECT id, module_id, lesson_index, title
      FROM lessons
      WHERE module_id = ANY(${moduleIds})
      ORDER BY module_id, lesson_index
    `;
    const result: Record<string, { id: string; lesson_index: number; title: string }[]> = {};
    for (const row of rows) {
      const r = row as { id: string; module_id: string; lesson_index: number; title: string };
      if (!result[r.module_id]) result[r.module_id] = [];
      result[r.module_id].push({ id: r.id, lesson_index: r.lesson_index, title: r.title });
    }
    return result;
  } catch (error) {
    console.error('getLessonsForCourse error:', error);
    return {};
  }
}

// ========================================
// DASHBOARD STATS
// ========================================

export interface DashboardStats {
  streak: number;
  coursesInProgress: number;
  coursesTotal: number;
  quizAverage: number | null;
}

export interface ResumeData {
  course: Course;
  moduleTitle: string;
  contentTitle: string;
  progress: number;
  href: string;
}

export interface WeeklyActivity {
  date: string;
  completions: number;
}

export interface ActivityData {
  date: string;
  count: number;
}

export interface CourseProgress {
  courseId: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  lastAccessed: string | null;
}

/**
 * Get dashboard stats for a user
 * Wrapped with React.cache() for per-request deduplication
 */
export const getDashboardStats = cache(async (userId: string): Promise<DashboardStats> => {
  try {
    const courses = await sql`SELECT id FROM courses`;
    const courseIds = courses.map((c: any) => c.id);

    let coursesInProgress = 0;
    let coursesTotal = 0;

    if (courseIds.length > 0) {
      const batchProgress = await sql`
        SELECT * FROM get_batch_course_progress(${userId}, ${courseIds})
      `;

      for (const p of batchProgress) {
        if ((p as any).progress_percent > 0) {
          coursesTotal++;
          if (!(p as any).is_completed) coursesInProgress++;
        }
      }
    }

    // Quiz average from user_quiz_attempts
    const quizRows = await sql`
      SELECT score_percent FROM user_quiz_attempts WHERE user_id = ${userId}
    `;

    const quizAverage = quizRows.length
      ? Math.round(quizRows.reduce((sum: number, r: any) => sum + r.score_percent, 0) / quizRows.length)
      : null;

    // Streak: union lesson completions + quiz attempts (capped at 366 days — streak can't exceed that)
    const activityDates = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId}
        AND passed_at IS NOT NULL
        AND passed_at >= NOW() - INTERVAL '366 days'
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= NOW() - INTERVAL '366 days'
      ORDER BY completed_at DESC
    `;

    let streak = 0;
    if (activityDates.length > 0) {
      const uniqueDates = [...new Set(
        activityDates.map((a: any) => new Date(a.completed_at).toDateString())
      )];

      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i - 1]);
          const currDate = new Date(uniqueDates[i]);
          const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return { streak, coursesInProgress, coursesTotal, quizAverage };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return { streak: 0, coursesInProgress: 0, coursesTotal: 0, quizAverage: null };
  }
});

/**
 * Get resume data for most recently accessed incomplete course
 * Wrapped with React.cache() for per-request deduplication
 */
export const getResumeData = cache(async (userId: string): Promise<ResumeData | null> => {
  try {
    const allCourses = await sql`SELECT id, slug FROM courses ORDER BY created_at ASC`;
    const courseIds = allCourses.map((c: any) => c.id);
    if (courseIds.length === 0) return null;

    const batchProgress = await sql`
      SELECT * FROM get_batch_course_progress(${userId}, ${courseIds})
    `;

    const incompleteCourses = batchProgress.filter(
      (p: any) => p.progress_percent > 0 && !p.is_completed
    );

    if (incompleteCourses.length === 0) return null;

    // Recent activity: union lesson completions + quiz attempts
    const recentActivity = await sql`
      SELECT l.module_id, l.lesson_index AS section_index, uc.passed_at AS completed_at
      FROM user_code uc
      JOIN lessons l ON l.id = uc.lesson_id
      WHERE uc.user_id = ${userId} AND uc.passed_at IS NOT NULL
      UNION ALL
      SELECT module_id, NULL AS section_index, attempted_at AS completed_at
      FROM user_quiz_attempts
      WHERE user_id = ${userId}
      ORDER BY completed_at DESC
      LIMIT 50
    `;

    const incompleteIds = incompleteCourses.map((c: any) => c.course_id);
    const incompleteIdSet = new Set<string>(incompleteIds);
    const moduleRows = await sql`
      SELECT id, course_id FROM modules WHERE course_id = ANY(${incompleteIds})
    `;
    const moduleMap = new Map<string, string>(
      (moduleRows as any[]).map((m) => [m.id, m.course_id])
    );

    let targetCourseId: string | null = null;
    let lastActivity: { module_id: string; section_index: number | null } | null = null;

    for (const activity of recentActivity) {
      const courseId = moduleMap.get((activity as any).module_id);
      if (courseId && incompleteIdSet.has(courseId)) {
        const mod = { course_id: courseId };
        targetCourseId = mod.course_id;
        lastActivity = {
          module_id: (activity as any).module_id,
          section_index: (activity as any).section_index,
        };
        break;
      }
    }

    if (!targetCourseId) targetCourseId = (incompleteCourses[0] as any).course_id;
    if (!targetCourseId) return null;

    const targetCourseSlug = (allCourses as any[]).find((c) => c.id === targetCourseId)?.slug;
    if (!targetCourseSlug) return null;

    const course = await getCourseWithModules(targetCourseSlug);
    if (!course) return null;

    const progressPercent = (incompleteCourses.find(
      (c: any) => c.course_id === targetCourseId
    ) as any)?.progress_percent || 0;

    let href = `/dashboard/course/${course.slug}`;
    if (lastActivity) {
      const moduleId = lastActivity.module_id;
      const currentModule = course.modules.find(m => m.id === moduleId);
      if (currentModule) {
        if (lastActivity.section_index === null) {
          href = `/dashboard/course/${course.slug}/${currentModule.slug}/quiz`;
        } else {
          href = `/dashboard/course/${course.slug}/${currentModule.slug}/lesson/${lastActivity.section_index + 1}`;
        }
      }
    }

    return {
      course,
      moduleTitle: lastActivity
        ? course.modules.find(m => m.id === lastActivity!.module_id)?.title || 'Module 1'
        : 'Module 1',
      contentTitle: lastActivity?.section_index === null
        ? 'Quiz'
        : `Lesson ${(lastActivity?.section_index ?? 0) + 1}`,
      progress: progressPercent,
      href,
    };
  } catch (error) {
    console.error('getResumeData error:', error);
    return null;
  }
});

/**
 * Get weekly activity (last 7 days)
 */
export async function getWeeklyActivity(userId: string): Promise<WeeklyActivity[]> {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const since = weekAgo.toISOString();

    const data = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId} AND passed_at IS NOT NULL AND passed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;

    const byDate: Record<string, number> = {};
    data.forEach((row: any) => {
      if (row.completed_at) {
        const date = new Date(row.completed_at).toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }
    });

    const result: WeeklyActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ date: dateStr, completions: byDate[dateStr] || 0 });
    }

    return result;
  } catch (error) {
    console.error('getWeeklyActivity error:', error);
    return [];
  }
}

/**
 * Get activity data for heatmap (last 6 months)
 */
export async function getActivityHeatmapData(userId: string): Promise<ActivityData[]> {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const since = sixMonthsAgo.toISOString();

    const data = await sql`
      SELECT passed_at AS completed_at FROM user_code
      WHERE user_id = ${userId} AND passed_at IS NOT NULL AND passed_at >= ${since}
      UNION ALL
      SELECT attempted_at AS completed_at FROM user_quiz_attempts
      WHERE user_id = ${userId} AND attempted_at >= ${since}
    `;

    const byDate: Record<string, number> = {};
    data.forEach((row: any) => {
      if (row.completed_at) {
        const date = new Date(row.completed_at).toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }
    });

    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  } catch (error) {
    console.error('getActivityHeatmapData error:', error);
    return [];
  }
}

/**
 * Get progress for all courses for a user (batch optimized)
 */
export async function getUserCoursesProgress(userId: string, courseIds: string[]): Promise<Record<string, CourseProgress>> {
  if (courseIds.length === 0) return {};

  try {
    const progressData = await sql`
      SELECT * FROM get_batch_course_progress(${userId}, ${courseIds})
    `;

    const result: Record<string, CourseProgress> = {};

    for (const item of progressData) {
      const data = item as any;
      result[data.course_id] = {
        courseId: data.course_id,
        progress: data.progress_percent || 0,
        status: data.is_completed ? 'completed' : data.progress_percent > 0 ? 'in_progress' : 'not_started',
        lastAccessed: null,
      };
    }

    courseIds.forEach(id => {
      if (!result[id]) {
        result[id] = { courseId: id, progress: 0, status: 'not_started', lastAccessed: null };
      }
    });

    return result;
  } catch (error) {
    console.error('getUserCoursesProgress error:', error);
    return {};
  }
}

// ========================================
// SIDEBAR PROGRESS
// ========================================

export interface SidebarCourseProgress {
  courseId: string;
  progress: number;
  isCompleted: boolean;
}

/**
 * Get progress for all courses (optimized for sidebar display - batch query)
 */
export async function getSidebarProgress(
  userId: string,
  courseIds: string[]
): Promise<Record<string, SidebarCourseProgress>> {
  if (courseIds.length === 0) return {};

  try {
    const data = await sql`
      SELECT * FROM get_batch_course_progress(${userId}, ${courseIds})
    `;

    const result: Record<string, SidebarCourseProgress> = {};

    for (const item of data) {
      const prog = item as any;
      result[prog.course_id] = {
        courseId: prog.course_id,
        progress: prog.progress_percent || 0,
        isCompleted: prog.is_completed || false,
      };
    }

    return result;
  } catch (error) {
    console.error('getSidebarProgress error:', error);
    return {};
  }
}

// ========================================
// CONTENT COMPLETION
// ========================================

/**
 * Check if a specific lesson is completed by a user.
 */
export async function isLessonCompleted(userId: string, lessonId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_code
      WHERE user_id = ${userId} AND lesson_id = ${lessonId} AND passed_at IS NOT NULL
    `;
    return result.length > 0;
  } catch (error) {
    console.error('isLessonCompleted error:', error);
    return false;
  }
}

/**
 * Check if the quiz for a module has been passed by a user.
 */
export async function isQuizCompleted(userId: string, moduleId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_quiz_attempts
      WHERE user_id = ${userId} AND module_id = ${moduleId} AND passed = true
    `;
    return result.length > 0;
  } catch (error) {
    console.error('isQuizCompleted error:', error);
    return false;
  }
}

/**
 * Get completion status for sections across multiple modules.
 * Returns Record with keys like "{moduleId}:lesson-{i}" and "{moduleId}:quiz".
 */
export async function getSectionCompletionStatus(
  userId: string,
  modules: Module[]
): Promise<Record<string, SectionStatus>> {
  if (modules.length === 0) return {};

  try {
    const moduleIds = modules.map(m => m.id);

    const [lessonRows, completedRows, startedRows, passedRows] = await Promise.all([
      sql`SELECT id, module_id, lesson_index FROM lessons WHERE module_id = ANY(${moduleIds})`,
      sql`
        SELECT uc.lesson_id FROM user_code uc
        JOIN lessons l ON l.id = uc.lesson_id
        WHERE uc.user_id = ${userId}
          AND uc.passed_at IS NOT NULL
          AND l.module_id = ANY(${moduleIds})
      `,
      sql`
        SELECT DISTINCT uc.lesson_id FROM user_code uc
        JOIN lessons l ON l.id = uc.lesson_id
        WHERE uc.user_id = ${userId}
          AND uc.passed_at IS NULL
          AND l.module_id = ANY(${moduleIds})
      `,
      sql`
        SELECT DISTINCT module_id FROM user_quiz_attempts
        WHERE user_id = ${userId} AND module_id = ANY(${moduleIds}) AND passed = true
      `,
    ]);

    const completedSet = new Set((completedRows as any[]).map(r => r.lesson_id));
    const startedSet = new Set((startedRows as any[]).map(r => r.lesson_id));
    const passedQuizSet = new Set((passedRows as any[]).map(r => r.module_id));
    const result: Record<string, SectionStatus> = {};

    for (const m of modules) {
      for (const l of (lessonRows as any[]).filter(l => l.module_id === m.id)) {
        result[`${m.id}:lesson-${l.lesson_index}`] = completedSet.has(l.id)
          ? 'completed'
          : startedSet.has(l.id)
          ? 'in-progress'
          : 'not-started';
      }
      if (m.quiz_form) {
        result[`${m.id}:quiz`] = passedQuizSet.has(m.id) ? 'completed' : 'not-started';
      }
    }

    return result;
  } catch (error) {
    console.error('getSectionCompletionStatus error:', error);
    return {};
  }
}

/**
 * Check whether a user has submitted a course form.
 */
export async function getCourseFormResponse(
  userId: string,
  courseId: string,
  formType: 'onboarding' | 'completion'
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM user_course_form_responses
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND form_type = ${formType}
    `;
    return result.length > 0;
  } catch (error) {
    console.error('getCourseFormResponse error:', error);
    return false;
  }
}

/**
 * Persist a course form submission (idempotent via ON CONFLICT DO NOTHING).
 */
export async function submitCourseFormResponse(
  userId: string,
  courseId: string,
  formType: 'onboarding' | 'completion',
  responses: Record<string, string>
): Promise<void> {
  try {
    await sql`
      INSERT INTO user_course_form_responses (user_id, course_id, form_type, responses)
      VALUES (${userId}, ${courseId}, ${formType}, ${JSON.stringify(responses)}::JSONB)
      ON CONFLICT (user_id, course_id, form_type) DO NOTHING
    `;
  } catch (error) {
    console.error('submitCourseFormResponse error:', error);
    throw error;
  }
}

/**
 * Check if all lessons in a module are completed
 */
export async function areAllLessonsCompleted(userId: string, moduleId: string): Promise<boolean> {
  try {
    const [totalResult, completedResult] = await Promise.all([
      sql`SELECT COUNT(*)::INTEGER AS count FROM lessons WHERE module_id = ${moduleId}`,
      sql`
        SELECT COUNT(*)::INTEGER AS count
        FROM user_code uc
        JOIN lessons l ON l.id = uc.lesson_id
        WHERE uc.user_id = ${userId}
          AND uc.passed_at IS NOT NULL
          AND l.module_id = ${moduleId}
      `,
    ]);
    const total = (totalResult[0] as any).count;
    if (total === 0) return false;
    return (completedResult[0] as any).count >= total;
  } catch (error) {
    console.error('areAllLessonsCompleted error:', error);
    return false;
  }
}

/**
 * Batch check module completion status (optimized for course page)
 */
export interface ModuleCompletionStatus {
  allLessonsCompleted: boolean;
  quizCompleted: boolean;
}

export async function getBatchModuleCompletionStatus(
  userId: string,
  moduleIds: string[]
): Promise<Record<string, ModuleCompletionStatus>> {
  if (moduleIds.length === 0) return {};

  try {
    const data = await sql`
      SELECT * FROM get_batch_module_completion_status(${userId}, ${moduleIds})
    `;

    const result: Record<string, ModuleCompletionStatus> = {};

    for (const item of data) {
      const mod = item as any;
      result[mod.module_id] = {
        allLessonsCompleted: mod.all_lessons_completed || false,
        quizCompleted: mod.quiz_completed || false,
      };
    }

    moduleIds.forEach(id => {
      if (!result[id]) result[id] = { allLessonsCompleted: false, quizCompleted: false };
    });

    return result;
  } catch (error) {
    console.error('getBatchModuleCompletionStatus error:', error);
    return {};
  }
}

/**
 * Get all courses with modules for sidebar navigation.
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getCoursesForSidebar = cache(async (): Promise<CourseWithModules[]> => {
  try {
    const courses = await sql`
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
             intro_content, outro_content, onboarding_form, completion_form, created_at
      FROM courses
      ORDER BY created_at ASC
    `;

    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => (c as any).id);
    const allModules = await sql`
      SELECT m.id, m.course_id, m.slug, m.title, m.description, m."order",
             m.quiz_form, m.intro_content, m.outro_content,
             COALESCE(lc.lesson_count, 0) AS lesson_count
      FROM modules m
      LEFT JOIN (
        SELECT module_id, COUNT(*)::INTEGER AS lesson_count
        FROM lessons GROUP BY module_id
      ) lc ON lc.module_id = m.id
      WHERE m.course_id = ANY(${courseIds})
      ORDER BY m."order" ASC
    `;

    const modulesByCourse = new Map<string, Module[]>();
    for (const mod of allModules) {
      const courseId = (mod as any).course_id;
      if (!modulesByCourse.has(courseId)) modulesByCourse.set(courseId, []);
      modulesByCourse.get(courseId)!.push(mod as Module);
    }

    return courses.map((course) => ({
      ...course,
      modules: (modulesByCourse.get((course as any).id) || []).map((m) => ({
        ...m,
        contentItems: deriveContentItems(m),
      })),
    } as CourseWithModules));
  } catch (error) {
    console.error('getCoursesForSidebar error:', error);
    return [];
  }
});
