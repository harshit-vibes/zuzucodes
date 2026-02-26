'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'prose-section'>;
}

export function ProseSectionTemplate({ content }: Props) {
  return (
    <div className="prose-container">
      <Markdown content={content.markdown} />
    </div>
  );
}
