'use client';

import { CheckCircle2 } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-intro'>;
}

export function CourseIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xl leading-relaxed text-foreground/85">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll achieve
        </p>
        <ul className={`grid gap-2.5 ${content.outcomes.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.who_is_this_for ? (
        <p className="text-sm text-muted-foreground/60 italic">{content.who_is_this_for}</p>
      ) : null}
    </div>
  );
}
