'use client';

import { Clock } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-intro'>;
}

export function LessonIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-l-2 border-primary/40 pl-4">
        <p className="text-lg leading-relaxed text-foreground/85">{content.hook}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll learn
        </p>
        <ul className="flex flex-col gap-2.5">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground/75">
              <span className="font-mono text-[10px] text-muted-foreground/40 shrink-0 mt-0.5 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.estimated_minutes ? (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/40 font-mono">
            ~{content.estimated_minutes} min
          </span>
        </div>
      ) : null}
    </div>
  );
}
