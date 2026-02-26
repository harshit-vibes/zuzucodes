'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-outro'>;
}

export function CourseOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>
      {content.certificate_info && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground/70">{content.certificate_info}</p>
        </div>
      )}
    </div>
  );
}
