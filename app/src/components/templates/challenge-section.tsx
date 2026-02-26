'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'challenge-section'>;
}

/**
 * Sentinel component — challenge-section is never rendered via renderTemplate.
 * LessonSections handles challenge sections directly from lesson fields.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChallengeSectionTemplate(_props: Props) {
  return null;
}
