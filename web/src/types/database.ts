// Supabase database types matching supabase/schema.sql
// These types use snake_case to match the database columns

export interface DbCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  category: string | null;
  duration: string | null;
  level: string | null;
  prerequisites: string[] | null;
  outcomes: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order: number;
  lesson_count: number | null;
  duration: string | null;
  outcomes: string[] | null;
  prerequisites: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbLesson {
  id: string;
  title: string;
  markdown_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbQuiz {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbModuleItem {
  id: string;
  module_id: string;
  order: number;
  item_type: 'lesson' | 'quiz';
  lesson_id: string | null;
  quiz_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbQuestion {
  id: string;
  quiz_id: string;
  order: number;
  statement: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnswerOption {
  id: string;
  question_id: string;
  text: string;
  hint_label: string | null;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      courses: {
        Row: DbCourse;
        Insert: Omit<DbCourse, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbCourse, 'id'>>;
      };
      modules: {
        Row: DbModule;
        Insert: Omit<DbModule, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbModule, 'id'>>;
      };
      lessons: {
        Row: DbLesson;
        Insert: Omit<DbLesson, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbLesson, 'id'>>;
      };
      quizzes: {
        Row: DbQuiz;
        Insert: Omit<DbQuiz, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbQuiz, 'id'>>;
      };
      module_items: {
        Row: DbModuleItem;
        Insert: Omit<DbModuleItem, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbModuleItem, 'id'>>;
      };
      questions: {
        Row: DbQuestion;
        Insert: Omit<DbQuestion, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbQuestion, 'id'>>;
      };
      answer_options: {
        Row: DbAnswerOption;
        Insert: Omit<DbAnswerOption, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbAnswerOption, 'id'>>;
      };
    };
  };
}
