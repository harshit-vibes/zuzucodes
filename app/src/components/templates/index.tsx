'use client';

import type { ComponentType } from 'react';
import type { TemplateName } from '@/lib/templates/schemas';
import type { TemplateContent } from '@/lib/templates/types';

import { LessonIntroTemplate } from './lesson-intro';
import { LessonOutroTemplate } from './lesson-outro';
import { ModuleIntroTemplate } from './module-intro';
import { ModuleOutroTemplate } from './module-outro';
import { CourseIntroTemplate } from './course-intro';
import { CourseOutroTemplate } from './course-outro';

type TemplateComponentMap = { [K in TemplateName]: ComponentType<{ content: TemplateContent<K> }> };

/**
 * Maps every template name to its React component.
 * TypeScript errors here if any template in schemas.ts lacks a component.
 * Adding a template = add to schemas.ts + add a component file + add entry here.
 */
export const templateComponents: TemplateComponentMap = {
  'lesson-intro':  LessonIntroTemplate,
  'lesson-outro':  LessonOutroTemplate,
  'module-intro':  ModuleIntroTemplate,
  'module-outro':  ModuleOutroTemplate,
  'course-intro':  CourseIntroTemplate,
  'course-outro':  CourseOutroTemplate,
};

/** Render a section's content using its registered component. */
export function renderTemplate(template: TemplateName, content: unknown): React.ReactNode {
  const Component = templateComponents[template] as ComponentType<{ content: unknown }>;
  return <Component content={content} />;
}
