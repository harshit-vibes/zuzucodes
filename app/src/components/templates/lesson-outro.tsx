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
        <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-success shrink-0" />
        <span className="text-xs font-mono uppercase tracking-widest text-success/70">
          Lesson complete
        </span>
      </div>

      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60 mb-1">
              Up next
            </p>
            <p className="text-sm text-foreground/70">{content.next_lesson_teaser}</p>
          </div>
          <ArrowRight aria-hidden="true" className="w-4 h-4 text-primary/30 shrink-0 mt-1" />
        </div>
      ) : null}
    </div>
  );
}
