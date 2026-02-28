// app/scripts/create-course/validator.ts
import { z } from 'zod';
import { schemas } from '../../src/lib/templates/schemas';
import type { LessonJson, ModuleJson, CourseJson } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateLessonJson(lesson: Partial<LessonJson>): ValidationResult {
  const errors: string[] = [];

  if (!lesson.code_template) errors.push('missing code_template');
  if (!lesson.entry_point)   errors.push('missing entry_point');
  if (!lesson.solution_code) errors.push('missing solution_code');
  if (!lesson.problem_summary?.trim()) errors.push('problem_summary is empty');
  if (!lesson.test_cases || lesson.test_cases.length === 0) errors.push('no test_cases');

  if (lesson.intro_content) {
    const r = schemas['lesson-intro'].safeParse(lesson.intro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (lesson.outro_content) {
    const r = schemas['lesson-outro'].safeParse(lesson.outro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  for (const tc of lesson.test_cases ?? []) {
    if (!tc.description) errors.push(`test_case[${tc.position}]: missing description`);
    if (!Array.isArray(tc.args)) errors.push(`test_case[${tc.position}]: args must be array`);
    if (tc.expected === undefined) errors.push(`test_case[${tc.position}]: missing expected`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateModuleJson(mod: Partial<ModuleJson>): ValidationResult {
  const errors: string[] = [];

  if (mod.intro_content) {
    const r = schemas['module-intro'].safeParse(mod.intro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (mod.outro_content) {
    const r = schemas['module-outro'].safeParse(mod.outro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  const qf = mod.quiz_form;
  if (!qf) {
    errors.push('missing quiz_form');
  } else {
    if (!qf.title) errors.push('quiz_form: missing title');
    if (!Number.isInteger(qf.passingScore) || qf.passingScore < 0 || qf.passingScore > 100)
      errors.push('quiz_form: passingScore must be integer 0–100');
    if (!Array.isArray(qf.questions) || qf.questions.length === 0)
      errors.push('quiz_form: must have at least 1 question');
    for (const q of qf.questions ?? []) {
      if (!q.id)            errors.push(`quiz question: missing id`);
      if (!q.statement)     errors.push(`quiz question ${q.id}: missing statement`);
      if (!q.correctOption) errors.push(`quiz question ${q.id}: missing correctOption`);
      if (!q.explanation)   errors.push(`quiz question ${q.id}: missing explanation`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        errors.push(`quiz question ${q.id}: must have ≥ 2 options`);
      if (!q.options?.some(o => o.id === q.correctOption))
        errors.push(`quiz question ${q.id}: correctOption "${q.correctOption}" not in options`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateCourseJson(course: Partial<CourseJson>): ValidationResult {
  const errors: string[] = [];

  if (course.intro_content) {
    const r = schemas['course-intro'].safeParse(course.intro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (course.outro_content) {
    const r = schemas['course-outro'].safeParse(course.outro_content);
    if (!r.success) r.error.issues.forEach((e: z.ZodIssue) => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  if (!course.confidence_form) {
    errors.push('missing confidence_form');
  } else if (!Array.isArray(course.confidence_form.questions) || course.confidence_form.questions.length === 0) {
    errors.push('confidence_form: must have at least 1 question');
  }

  return { ok: errors.length === 0, errors };
}
