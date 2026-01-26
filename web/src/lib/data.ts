import fs from 'fs';
import path from 'path';
import { Course, Module, ModuleItem, Lesson, CourseWithModules, ModuleWithLessons } from '@/types/course';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

// ========================================
// JSON FILE DATA SOURCE (static)
// ========================================

function readJson<T>(filePath: string): T {
  const fullPath = path.join(DATA_DIR, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

function readJsonDir<T>(dirPath: string): T[] {
  const fullPath = path.join(DATA_DIR, dirPath);
  const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));
  return files.map(f => readJson<T>(path.join(dirPath, f)));
}

export function getCourse(courseId: string): Course {
  const courses = getAllCourses();
  const course = courses.find(c => c.courseId === courseId);
  if (!course) {
    throw new Error(`Course not found: ${courseId}`);
  }
  return course;
}

export function getAllCourses(): Course[] {
  return readJsonDir<Course>('courses');
}

export function getModules(courseId: string): Module[] {
  const modules = readJsonDir<Module>('modules');
  return modules
    .filter(m => m.courseId === courseId)
    .sort((a, b) => a.order - b.order);
}

export function getModuleItems(moduleId: string): ModuleItem[] {
  const items = readJsonDir<ModuleItem>('module-items');
  return items
    .filter(i => i.moduleId === moduleId)
    .sort((a, b) => a.order - b.order);
}

export function getLesson(lessonId: string): Lesson {
  return readJson<Lesson>(`lessons/${lessonId}.json`);
}

export function getAllLessons(): Lesson[] {
  return readJsonDir<Lesson>('lessons');
}

export function getCourseWithModules(courseId: string): CourseWithModules {
  const course = getCourse(courseId);
  const modules = getModules(courseId);
  const allLessons = getAllLessons();

  const modulesWithLessons: ModuleWithLessons[] = modules.map(module => {
    const items = getModuleItems(module.moduleId);
    const lessons = items
      .filter(item => item.itemType === 'lesson' && item.lessonId)
      .map(item => allLessons.find(l => l.lessonId === item.lessonId)!)
      .filter(Boolean);

    return { ...module, lessons };
  });

  return { ...course, modules: modulesWithLessons };
}

export function getDefaultCourse(): CourseWithModules {
  const courses = getAllCourses();
  if (courses.length === 0) {
    throw new Error('No courses found');
  }
  return getCourseWithModules(courses[0].courseId);
}

// ========================================
// SUPABASE DATA SOURCE (async)
// ========================================

import { getSupabase } from './supabase';
import type { DbCourse, DbModule, DbModuleItem, DbLesson } from '@/types/database';

// Transform database row to app type
function dbToCourse(row: DbCourse): Course {
  return {
    courseId: row.id,
    title: row.title,
    description: row.description || '',
    thumbnailUrl: row.thumbnail_url,
    authorName: row.author_name || '',
    category: row.category || '',
    duration: row.duration || '',
    level: row.level || '',
    prerequisites: row.prerequisites?.join(', ') || '',
    outcomes: row.outcomes || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToModule(row: DbModule): Module {
  return {
    moduleId: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description || '',
    order: row.order,
    lessonCount: row.lesson_count || 0,
    duration: row.duration || '',
    outcomes: row.outcomes || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToModuleItem(row: DbModuleItem): ModuleItem {
  return {
    itemId: row.id,
    moduleId: row.module_id,
    order: row.order,
    itemType: row.item_type,
    lessonId: row.lesson_id,
    quizId: row.quiz_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToLesson(row: DbLesson): Lesson {
  return {
    lessonId: row.id,
    title: row.title,
    markdownContent: row.markdown_content || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Async Supabase query functions

export async function fetchAllCourses(): Promise<Course[]> {
  const { data, error } = await getSupabase()
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch courses: ${error.message}`);
  return (data || []).map(dbToCourse);
}

export async function fetchCourse(courseId: string): Promise<Course> {
  const { data, error } = await getSupabase()
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw new Error(`Course not found: ${courseId}`);
  return dbToCourse(data);
}

export async function fetchModules(courseId: string): Promise<Module[]> {
  const { data, error } = await getSupabase()
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true });

  if (error) throw new Error(`Failed to fetch modules: ${error.message}`);
  return (data || []).map(dbToModule);
}

export async function fetchModuleItems(moduleId: string): Promise<ModuleItem[]> {
  const { data, error } = await getSupabase()
    .from('module_items')
    .select('*')
    .eq('module_id', moduleId)
    .order('order', { ascending: true });

  if (error) throw new Error(`Failed to fetch module items: ${error.message}`);
  return (data || []).map(dbToModuleItem);
}

export async function fetchLesson(lessonId: string): Promise<Lesson> {
  const { data, error } = await getSupabase()
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (error) throw new Error(`Lesson not found: ${lessonId}`);
  return dbToLesson(data);
}

export async function fetchAllLessons(): Promise<Lesson[]> {
  const { data, error } = await getSupabase()
    .from('lessons')
    .select('*');

  if (error) throw new Error(`Failed to fetch lessons: ${error.message}`);
  return (data || []).map(dbToLesson);
}

export async function fetchCourseWithModules(courseId: string): Promise<CourseWithModules> {
  const course = await fetchCourse(courseId);
  const modules = await fetchModules(courseId);
  const allLessons = await fetchAllLessons();

  const modulesWithLessons: ModuleWithLessons[] = await Promise.all(
    modules.map(async (module) => {
      const items = await fetchModuleItems(module.moduleId);
      const lessons = items
        .filter(item => item.itemType === 'lesson' && item.lessonId)
        .map(item => allLessons.find(l => l.lessonId === item.lessonId)!)
        .filter(Boolean);

      return { ...module, lessons };
    })
  );

  return { ...course, modules: modulesWithLessons };
}

export async function fetchDefaultCourse(): Promise<CourseWithModules> {
  const courses = await fetchAllCourses();
  if (courses.length === 0) {
    throw new Error('No courses found');
  }
  return fetchCourseWithModules(courses[0].courseId);
}

// Search lessons by full-text query
export async function searchLessons(query: string): Promise<Lesson[]> {
  const { data, error } = await getSupabase()
    .from('lessons')
    .select('*')
    .textSearch('search_vector', query, { type: 'websearch' });

  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data || []).map(dbToLesson);
}
