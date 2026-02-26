import type { z } from 'zod';
import { schemas, type TemplateName } from './schemas';
import type { TemplateContent } from './types';

export type ValidationResult<T extends TemplateName> =
  | { success: true; data: TemplateContent<T> }
  | { success: false; error: z.ZodError };

/**
 * Validate content against its template schema.
 * Returns a result object — caller decides how to handle failure.
 * Use in API routes.
 */
export function validateContent<T extends TemplateName>(
  template: T,
  content: unknown,
): ValidationResult<T> {
  const result = schemas[template].safeParse(content);
  if (result.success) {
    return { success: true, data: result.data as TemplateContent<T> };
  }
  return { success: false, error: result.error };
}

/**
 * Assert that content is valid against its template schema.
 * Throws a ZodError on invalid input.
 * Use in seed scripts where failure should be loud and immediate.
 */
export function assertValidContent<T extends TemplateName>(
  template: T,
  content: unknown,
): TemplateContent<T> {
  return schemas[template].parse(content) as TemplateContent<T>;
}
