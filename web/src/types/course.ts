// Types matching data/db-plan.md schema

export interface Course {
  courseId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  authorName: string;
  category: string;
  duration: string;
  level: string;
  prerequisites: string;
  outcomes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessonCount: number;
  duration: string;
  outcomes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleItem {
  itemId: string;
  moduleId: string;
  order: number;
  itemType: 'lesson' | 'quiz';
  lessonId: string | null;
  quizId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  lessonId: string;
  title: string;
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  quizId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Aggregated types for UI
export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface CourseWithModules extends Course {
  modules: ModuleWithLessons[];
}
