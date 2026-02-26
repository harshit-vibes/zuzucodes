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

      {content.takeaway ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-foreground/70">{content.takeaway}</p>
        </div>
      ) : null}
    </div>
  );
}
