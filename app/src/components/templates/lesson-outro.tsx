'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-outro'>;
}

export function LessonOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        <span className="text-xs font-mono uppercase tracking-widest text-success/70">
          Lesson complete
        </span>
      </div>

      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser ? (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
        </div>
      ) : null}
    </div>
  );
}
