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
  // Load all items and lessons once — avoids N reads per module
  const allItems = readJsonDir<ModuleItem>('module-items');
  const allLessons = getAllLessons();
  const lessonMap = new Map(allLessons.map(l => [l.lessonId, l]));

  const modulesWithLessons: ModuleWithLessons[] = modules.map(module => {
    const items = allItems
      .filter(i => i.moduleId === module.moduleId)
      .sort((a, b) => a.order - b.order);
    const lessons = items
      .filter(item => item.itemType === 'lesson' && item.lessonId)
      .map(item => lessonMap.get(item.lessonId!))
      .filter((l): l is Lesson => Boolean(l));

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

