'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-intro'>;
}

export function CourseIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-foreground/80 leading-relaxed">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll achieve
        </p>
        <ul className="flex flex-col gap-2">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-primary" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.who_is_this_for && (
        <p className="text-sm text-muted-foreground/50">
          {content.who_is_this_for}
        </p>
      )}
    </div>
  );
}
