'use client';

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
        <ul className="flex flex-col gap-2">
          {content.what_you_learn.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
