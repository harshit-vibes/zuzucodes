'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-outro'>;
}

export function LessonOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser && (
        <div className="border-l-2 border-primary/30 pl-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
            Up next
          </p>
          <p className="text-sm text-foreground/60">{content.next_lesson_teaser}</p>
        </div>
      )}
    </div>
  );
}
