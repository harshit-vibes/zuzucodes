'use client';

import { renderTemplate } from '@/components/templates';
import type { TemplateName } from '@/lib/templates/schemas';

/**
 * Thin client wrapper so Server Components can render templates without
 * calling the 'use client' renderTemplate function directly.
 */
export function TemplateRenderer({ name, content }: { name: TemplateName; content: unknown }) {
  return renderTemplate(name, content);
}
