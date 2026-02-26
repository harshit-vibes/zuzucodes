'use client';

import { CheckCircle2 } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-intro'>;
}

export function ModuleIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{content.title}</h2>
        <p className="mt-2 text-foreground/70 leading-relaxed">{content.description}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          In this module
        </p>
        <ul className={`grid gap-2.5 ${content.what_you_learn.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
          {content.what_you_learn.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/75">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
