'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-outro'>;
}

export function CourseOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.certificate_info ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-2">
            Certificate
          </p>
          <p className="text-sm text-foreground/70">{content.certificate_info}</p>
        </div>
      ) : null}
    </div>
  );
}
