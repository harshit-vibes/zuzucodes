import { cache } from 'react';
import { sql } from '@/lib/neon';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

// ========================================
// TYPES
// ========================================

export interface LessonRules {
  maxChars: number;
  requireH1: boolean;
  allowedLanguages: string[];
  disallowedHtmlPatterns: string[];
}

export interface ModuleRules {
  minLessons: number;
  maxLessons: number;
  quizOptional: boolean;
}

export interface QuizRules {
  minPassingScore: number;
  maxPassingScore: number;
  minQuestions: number;
  maxQuestions: number;
  optionsPerQuestion: number;
  requiredFields: string[];
  requiredQuestionFields: string[];
  validCorrectOptions: string[];
}

export interface ContentSchemaDef {
  lesson_rules: LessonRules;
  module_rules: ModuleRules;
  quiz_rules: QuizRules;
}

export interface ContentSchema {
  version: number;
  description: string | null;
  schema_def: ContentSchemaDef;
  is_active: boolean;
  created_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ========================================
// SCHEMA FETCHING
// ========================================

export const getActiveSchema = cache(async (): Promise<ContentSchema | null> => {
  const rows = await sql`SELECT * FROM content_schema WHERE is_active = TRUE LIMIT 1`;
  if (!rows || rows.length === 0) return null;
  return rows[0] as ContentSchema;
});

// ========================================
// LESSON CONTENT VALIDATION
// ========================================

const parser = unified().use(remarkParse).use(remarkGfm);

export function validateLessonContent(
  content: string,
  rules: LessonRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Character limit
  if (content.length > rules.maxChars) {
    errors.push({
      field: 'content',
      message: `Lesson content exceeds ${rules.maxChars} characters (found ${content.length})`,
      code: 'MAX_CHARS_EXCEEDED',
    });
  }

  // Disallowed HTML patterns
  for (const pattern of rules.disallowedHtmlPatterns) {
    if (new RegExp(pattern, 'i').test(content)) {
      errors.push({
        field: 'content',
        message: `Content contains disallowed pattern: ${pattern}`,
        code: 'DISALLOWED_HTML_PATTERN',
      });
    }
  }

  // AST analysis
  const tree = parser.parse(content) as Root;
  let hasH1 = false;
  const codeLanguagesUsed = new Set<string>();

  visit(tree, (node) => {
    if (node.type === 'heading' && (node as any).depth === 1) {
      hasH1 = true;
    }
    if (node.type === 'code') {
      const lang = (node as any).lang as string | null;
      if (lang) codeLanguagesUsed.add(lang);
    }
  });

  // H1 required
  if (rules.requireH1 && !hasH1) {
    errors.push({
      field: 'content',
      message: 'Lesson content must start with an H1 heading',
      code: 'MISSING_H1',
    });
  }

  // Allowed languages
  if (rules.allowedLanguages.length > 0) {
    for (const lang of codeLanguagesUsed) {
      if (!rules.allowedLanguages.includes(lang)) {
        errors.push({
          field: 'content',
          message: `Code block uses disallowed language: ${lang}. Allowed: ${rules.allowedLanguages.join(', ')}`,
          code: 'DISALLOWED_CODE_LANGUAGE',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// MODULE STRUCTURE VALIDATION
// ========================================

export function validateModuleStructure(
  lessonCount: number,
  hasQuiz: boolean,
  rules: ModuleRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (lessonCount < rules.minLessons) {
    errors.push({
      field: 'lessons',
      message: `Module must have at least ${rules.minLessons} lesson(s), found ${lessonCount}`,
      code: 'MIN_LESSONS',
    });
  }
  if (lessonCount > rules.maxLessons) {
    errors.push({
      field: 'lessons',
      message: `Module must have at most ${rules.maxLessons} lesson(s), found ${lessonCount}`,
      code: 'MAX_LESSONS',
    });
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// QUIZ VALIDATION
// ========================================

export function validateQuizForm(
  quizForm: unknown,
  rules: QuizRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!quizForm || typeof quizForm !== 'object' || Array.isArray(quizForm)) {
    return {
      valid: false,
      errors: [{ field: 'quiz_form', message: 'quiz_form must be a non-null object', code: 'INVALID_TYPE' }],
    };
  }

  const quiz = quizForm as Record<string, unknown>;

  for (const field of rules.requiredFields) {
    if (!(field in quiz)) {
      errors.push({
        field: `quiz_form.${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  if (typeof quiz.passingScore === 'number') {
    if (quiz.passingScore < rules.minPassingScore) {
      errors.push({ field: 'quiz_form.passingScore', message: `passingScore must be at least ${rules.minPassingScore}`, code: 'MIN_PASSING_SCORE' });
    }
    if (quiz.passingScore > rules.maxPassingScore) {
      errors.push({ field: 'quiz_form.passingScore', message: `passingScore must be at most ${rules.maxPassingScore}`, code: 'MAX_PASSING_SCORE' });
    }
  }

  if (!Array.isArray(quiz.questions)) {
    if ('questions' in quiz) {
      errors.push({ field: 'quiz_form.questions', message: 'questions must be an array', code: 'INVALID_QUESTIONS_TYPE' });
    }
    return { valid: errors.length === 0, errors };
  }

  const questions = quiz.questions as Record<string, unknown>[];

  if (questions.length < rules.minQuestions) {
    errors.push({ field: 'quiz_form.questions', message: `Must have at least ${rules.minQuestions} question(s), found ${questions.length}`, code: 'MIN_QUESTIONS' });
  }
  if (questions.length > rules.maxQuestions) {
    errors.push({ field: 'quiz_form.questions', message: `Must have at most ${rules.maxQuestions} question(s), found ${questions.length}`, code: 'MAX_QUESTIONS' });
  }

  const seenIds = new Set<string>();
  questions.forEach((q, i) => {
    for (const field of rules.requiredQuestionFields) {
      if (!(field in q)) {
        errors.push({ field: `quiz_form.questions[${i}].${field}`, message: `Question ${i + 1} is missing required field: ${field}`, code: 'MISSING_QUESTION_FIELD' });
      }
    }
    if (typeof q.id === 'string') {
      if (seenIds.has(q.id)) {
        errors.push({ field: `quiz_form.questions[${i}].id`, message: `Duplicate question ID: ${q.id}`, code: 'DUPLICATE_QUESTION_ID' });
      }
      seenIds.add(q.id);
    }
    if (Array.isArray(q.options) && q.options.length !== rules.optionsPerQuestion) {
      errors.push({ field: `quiz_form.questions[${i}].options`, message: `Question ${i + 1} must have exactly ${rules.optionsPerQuestion} options, found ${q.options.length}`, code: 'INVALID_OPTION_COUNT' });
    }
    if (typeof q.correctOption === 'string' && !rules.validCorrectOptions.includes(q.correctOption)) {
      errors.push({ field: `quiz_form.questions[${i}].correctOption`, message: `Question ${i + 1} has invalid correctOption: ${q.correctOption}`, code: 'INVALID_CORRECT_OPTION' });
    }
  });

  return { valid: errors.length === 0, errors };
}
