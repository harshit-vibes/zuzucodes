'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'code-section'>;
}

export function CodeSectionTemplate({ content }: Props) {
  const fenced = `\`\`\`${content.language}\n${content.code}\n\`\`\``;

  return (
    <div className="flex flex-col gap-4">
      <div className="prose-container">
        <Markdown content={content.explanation} />
      </div>

      <div className="prose-container">
        <Markdown content={fenced} />
      </div>

      {content.takeaway && (
        <p className="text-sm text-muted-foreground/60 italic border-t border-border/20 pt-4">
          {content.takeaway}
        </p>
      )}
    </div>
  );
}
