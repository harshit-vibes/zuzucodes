/**
 * Data layer for zuzu.codes
 * Uses Neon database with raw SQL queries via @neondatabase/serverless
 */

import { cache } from 'react';
import { sql } from '@/lib/neon';
import { getMdxSectionTitles } from '@/lib/mdx-utils';

// ========================================
// TYPES
// ========================================

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  outcomes: string[] | null;
  tag: string | null;
  order: number;
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
  title: string;
  description: string | null;
  order: number;
  mdx_content: string | null;
  quiz_form: QuizForm | null;
  section_count: number;
  schema_version: number | null;
}

export interface ContentItem {
  type: 'lesson' | 'quiz';
  index: number; // 0-based for lessons, -1 for quiz
  title: string;
}

export type CourseWithModules = Course & {
  modules: (Module & { contentItems: ContentItem[] })[];
};

/**
 * Derive content items from module fields (section_count + quiz_form).
 * Uses mdx_content headings for real lesson titles when available.
 */
function deriveContentItems(m: Module): ContentItem[] {
  const items: ContentItem[] = [];
  const titles = m.mdx_content ? getMdxSectionTitles(m.mdx_content) : [];
  for (let i = 0; i < m.section_count; i++) {
    items.push({ type: 'lesson', index: i, title: titles[i] || `Lesson ${i + 1}` });
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
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order", created_at
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
 * Get all courses with modules for sidebar navigation
 */
export async function getCoursesWithModules(): Promise<CourseWithModules[]> {
  try {
    const courses = await sql`
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order", created_at
      FROM courses
      ORDER BY created_at DESC
    `;

    const coursesWithModules: CourseWithModules[] = [];

    for (const course of courses) {
      const modules = await sql`
        SELECT id, course_id, title, description, "order",
               mdx_content, section_count, quiz_form, schema_version
        FROM modules
        WHERE course_id = ${course.id}
        ORDER BY "order" ASC
      `;

      coursesWithModules.push({
        ...course,
        modules: (modules as Module[]).map((m) => ({
          ...m,
          contentItems: deriveContentItems(m),
        })),
      } as CourseWithModules);
    }

    return coursesWithModules;
  } catch (error) {
    console.error('getCoursesWithModules error:', error);
    return [];
  }
}

/**
 * Get course with all modules and their contents
 * Wrapped with React.cache() for per-request deduplication
 */
export const getCourseWithModules = cache(async (courseId: string): Promise<CourseWithModules | null> => {
  try {
    const courses = await sql`
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order", created_at
      FROM courses
      WHERE id = ${courseId}
    `;

    if (courses.length === 0) return null;
    const course = courses[0];

    const modules = await sql`
      SELECT id, course_id, title, description, "order",
             mdx_content, section_count, quiz_form, schema_version
      FROM modules
      WHERE course_id = ${courseId}
      ORDER BY "order" ASC
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
export const getModule = cache(async (moduleId: string): Promise<Module | null> => {
  try {
    const result = await sql`
      SELECT id, course_id, title, description, "order",
             mdx_content, section_count, quiz_form, schema_version
      FROM modules
      WHERE id = ${moduleId}
    `;

    return result.length > 0 ? (result[0] as Module) : null;
  } catch (error) {
    console.error('getModule error:', error);
    return null;
  }
});

export interface LessonData {
  index: number;
  content: string;
  moduleId: string;
  moduleTitle: string;
}

/**
 * Get lesson by module and position (1-indexed)
 */
export async function getLesson(
  moduleId: string,
  position: number
): Promise<LessonData | null> {
  const { getMdxSection } = await import('@/lib/mdx-utils');

  const module = await getModule(moduleId);
  if (!module || !module.mdx_content) return null;

  const sectionIndex = position - 1;
  const content = getMdxSection(module.mdx_content, sectionIndex);
  if (!content) return null;

  return {
    index: sectionIndex,
    content,
    moduleId: module.id,
    moduleTitle: module.title,
  };
}

/**
 * Get lesson count for a module
 */
export async function getLessonCount(moduleId: string): Promise<number> {
  const module = await getModule(moduleId);
  return module?.section_count ?? 0;
}

/**
 * Get quiz form for a module
 */
export async function getQuiz(moduleId: string): Promise<QuizForm | null> {
  const module = await getModule(moduleId);
  return module?.quiz_form ?? null;
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
    // Get all courses
    const courses = await sql`SELECT id FROM courses`;
    const courseIds = courses.map((c: any) => c.id);

    let coursesInProgress = 0;
    let coursesTotal = 0;

    if (courseIds.length > 0) {
      // Get batch progress using the Postgres function
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

    // Get quiz average
    const quizRows = await sql`
      SELECT score_percent
      FROM user_progress
      WHERE user_id = ${userId}
        AND score_percent IS NOT NULL
    `;

    const quizAverage = quizRows.length
      ? Math.round(quizRows.reduce((sum: number, r: any) => sum + r.score_percent, 0) / quizRows.length)
      : null;

    // Calculate streak
    const activityDates = await sql`
      SELECT completed_at
      FROM user_progress
      WHERE user_id = ${userId}
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

    return {
      streak,
      coursesInProgress,
      coursesTotal,
      quizAverage,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      streak: 0,
      coursesInProgress: 0,
      coursesTotal: 0,
      quizAverage: null,
    };
  }
});

/**
 * Get resume data for most recently accessed incomplete course
 * Wrapped with React.cache() for per-request deduplication
 */
export const getResumeData = cache(async (userId: string): Promise<ResumeData | null> => {
  try {
    // Get all courses
    const allCourses = await sql`
      SELECT id FROM courses ORDER BY created_at ASC
    `;

    const courseIds = allCourses.map((c: any) => c.id);
    if (courseIds.length === 0) return null;

    const batchProgress = await sql`
      SELECT * FROM get_batch_course_progress(${userId}, ${courseIds})
    `;

    // Find incomplete courses with progress > 0
    const incompleteCourses = batchProgress.filter(
      (p: any) => p.progress_percent > 0 && !p.is_completed
    );

    if (incompleteCourses.length === 0) return null;

    // Find last activity
    const recentActivity = await sql`
      SELECT module_id, section_index, completed_at
      FROM user_progress
      WHERE user_id = ${userId}
      ORDER BY completed_at DESC
      LIMIT 50
    `;

    // Map module → course
    const incompleteIds = incompleteCourses.map((c: any) => c.course_id);
    const moduleMap = await sql`
      SELECT id, course_id
      FROM modules
      WHERE course_id = ANY(${incompleteIds})
    `;

    // Find which incomplete course was most recently accessed
    let targetCourseId: string | null = null;
    let lastActivity: { module_id: string; section_index: number | null } | null = null;

    for (const activity of recentActivity) {
      const mod = moduleMap.find((m: any) => m.id === (activity as any).module_id);
      if (mod && incompleteIds.includes((mod as any).course_id)) {
        targetCourseId = (mod as any).course_id;
        lastActivity = {
          module_id: (activity as any).module_id,
          section_index: (activity as any).section_index
        };
        break;
      }
    }

    if (!targetCourseId) {
      targetCourseId = (incompleteCourses[0] as any).course_id;
    }

    if (!targetCourseId) return null;

    const course = await getCourseWithModules(targetCourseId);
    if (!course) return null;

    const progressPercent = (incompleteCourses.find(
      (c: any) => c.course_id === targetCourseId
    ) as any)?.progress_percent || 0;

    // Build resume href
    let href = `/dashboard/course/${course.id}`;
    if (lastActivity) {
      const moduleId = lastActivity.module_id;
      const currentModule = course.modules.find(m => m.id === moduleId);
      if (currentModule) {
        if (lastActivity.section_index === null) {
          href = `/dashboard/course/${course.id}/${moduleId}/quiz`;
        } else {
          href = `/dashboard/course/${course.id}/${moduleId}/lesson/${lastActivity.section_index + 1}`;
        }
      }
    }

    return {
      course,
      moduleTitle: lastActivity ? course.modules.find(m => m.id === lastActivity!.module_id)?.title || 'Module 1' : 'Module 1',
      contentTitle: lastActivity?.section_index === null ? 'Quiz' : `Lesson ${(lastActivity?.section_index ?? 0) + 1}`,
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

    const data = await sql`
      SELECT completed_at
      FROM user_progress
      WHERE user_id = ${userId}
        AND completed_at >= ${weekAgo.toISOString()}
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
      result.push({
        date: dateStr,
        completions: byDate[dateStr] || 0,
      });
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

    const data = await sql`
      SELECT completed_at
      FROM user_progress
      WHERE user_id = ${userId}
        AND completed_at >= ${sixMonthsAgo.toISOString()}
    `;

    const byDate: Record<string, number> = {};
    data.forEach((row: any) => {
      if (row.completed_at) {
        const date = row.completed_at.split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }
    });

    return Object.entries(byDate).map(([date, count]) => ({
      date,
      count,
    }));
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

    // Fill in not-started courses
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
  if (courseIds.length === 0) {
    return {};
  }

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
 * Check if a specific section is completed by a user.
 * For lessons: sectionIndex is 0-based, checks for row with score_percent IS NULL.
 * For quiz: sectionIndex is null, checks for row with passed = true.
 */
export async function isSectionCompleted(
  userId: string,
  moduleId: string,
  sectionIndex: number | null
): Promise<boolean> {
  try {
    let data;
    if (sectionIndex !== null) {
      // Lesson
      data = await sql`
        SELECT id, passed
        FROM user_progress
        WHERE user_id = ${userId}
          AND module_id = ${moduleId}
          AND section_index = ${sectionIndex}
          AND score_percent IS NULL
      `;
    } else {
      // Quiz
      data = await sql`
        SELECT id, passed
        FROM user_progress
        WHERE user_id = ${userId}
          AND module_id = ${moduleId}
          AND section_index IS NULL
          AND passed = true
      `;
    }

    if (!data || data.length === 0) {
      return false;
    }

    return sectionIndex !== null ? true : data.some((row: any) => row.passed === true);
  } catch (error) {
    console.error('isSectionCompleted error:', error);
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
): Promise<Record<string, boolean>> {
  if (modules.length === 0) return {};

  try {
    const moduleIds = modules.map(m => m.id);

    const data = await sql`
      SELECT module_id, section_index, score_percent, passed
      FROM user_progress
      WHERE user_id = ${userId}
        AND module_id = ANY(${moduleIds})
    `;

    const result: Record<string, boolean> = {};

    // Initialize all items as false
    for (const m of modules) {
      for (let i = 0; i < m.section_count; i++) {
        result[`${m.id}:lesson-${i}`] = false;
      }
      if (m.quiz_form) {
        result[`${m.id}:quiz`] = false;
      }
    }

    // Mark completed items
    for (const row of data) {
      const r = row as any;
      if (r.section_index !== null && r.score_percent === null) {
        // Lesson completion
        result[`${r.module_id}:lesson-${r.section_index}`] = true;
      } else if (r.section_index === null && r.passed === true) {
        // Quiz completion
        result[`${r.module_id}:quiz`] = true;
      }
    }

    return result;
  } catch (error) {
    console.error('getSectionCompletionStatus error:', error);
    return {};
  }
}

/**
 * Check if all lessons in a module are completed
 */
export async function areAllLessonsCompleted(
  userId: string,
  moduleId: string
): Promise<boolean> {
  try {
    const module = await getModule(moduleId);
    if (!module || module.section_count === 0) return false;

    const data = await sql`
      SELECT section_index
      FROM user_progress
      WHERE user_id = ${userId}
        AND module_id = ${moduleId}
        AND section_index IS NOT NULL
        AND score_percent IS NULL
    `;

    return (data.length) >= module.section_count;
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

    // Fill in missing modules with defaults
    moduleIds.forEach(id => {
      if (!result[id]) {
        result[id] = {
          allLessonsCompleted: false,
          quizCompleted: false,
        };
      }
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
      SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order", created_at
      FROM courses
      ORDER BY created_at ASC
    `;

    if (courses.length === 0) return [];

    // Batch load all modules in a single query (fixes N+1 pattern)
    const courseIds = courses.map((c) => (c as any).id);
    const allModules = await sql`
      SELECT id, course_id, title, description, "order",
             mdx_content, section_count, quiz_form, schema_version
      FROM modules
      WHERE course_id = ANY(${courseIds})
      ORDER BY "order" ASC
    `;

    // Group modules by course_id in memory
    const modulesByCourse = new Map<string, Module[]>();
    for (const module of allModules) {
      const courseId = (module as any).course_id;
      if (!modulesByCourse.has(courseId)) {
        modulesByCourse.set(courseId, []);
      }
      modulesByCourse.get(courseId)!.push(module as Module);
    }

    // Assemble courses with their modules
    const coursesWithModules: CourseWithModules[] = courses.map((course) => ({
      ...course,
      modules: (modulesByCourse.get((course as any).id) || []).map((m) => ({
        ...m,
        contentItems: deriveContentItems(m),
      })),
    } as CourseWithModules));

    return coursesWithModules;
  } catch (error) {
    console.error('getCoursesForSidebar error:', error);
    return [];
  }
});
