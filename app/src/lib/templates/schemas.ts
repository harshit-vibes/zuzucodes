import { z } from 'zod';

export const schemas = {
  // ── Lesson level ─────────────────────────────────────────────────────────
  'lesson-intro': z.object({
    hook: z
      .string()
      .min(1)
      .describe('Opening sentence that frames why this lesson matters.'),
    outcomes: z
      .array(z.string().min(1))
      .min(1)
      .describe('What the learner will be able to do after this lesson.'),
    estimated_minutes: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Estimated completion time in minutes.'),
  }),

  'lesson-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('2–3 sentence summary of what was covered.'),
    next_lesson_teaser: z
      .string()
      .optional()
      .describe('One sentence previewing what comes next.'),
  }),

  // ── Module level ──────────────────────────────────────────────────────────
  'module-intro': z.object({
    title: z.string().min(1).describe('Module title.'),
    description: z
      .string()
      .min(1)
      .describe('What this module covers. 2–3 sentences.'),
    what_you_learn: z
      .array(z.string().min(1))
      .min(1)
      .describe('Bullet list of learning outcomes for the module.'),
  }),

  'module-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('Summary of what the module covered.'),
    next_module: z
      .string()
      .optional()
      .describe('Name or teaser of the next module.'),
  }),

  // ── Course level ──────────────────────────────────────────────────────────
  'course-intro': z.object({
    hook: z.string().min(1).describe('Opening hook for the course.'),
    outcomes: z
      .array(z.string().min(1))
      .min(1)
      .describe('High-level outcomes for the full course.'),
    who_is_this_for: z
      .string()
      .optional()
      .describe('Target audience description.'),
  }),

  'course-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('Summary of the full course journey.'),
    certificate_info: z
      .string()
      .optional()
      .describe('Info about any certificate or credential earned.'),
  }),
} as const;

export type TemplateName = keyof typeof schemas;
