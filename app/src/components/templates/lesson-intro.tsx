'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-intro'>;
}

export function LessonIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-foreground/80 leading-relaxed">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll learn
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

      {content.estimated_minutes && (
        <p className="text-xs text-muted-foreground/40 font-mono">
          ~{content.estimated_minutes} min
        </p>
      )}
    </div>
  );
}
