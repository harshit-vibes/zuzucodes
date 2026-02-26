'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-outro'>;
}

export function ModuleOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>
      {content.next_module && (
        <div className="border-l-2 border-primary/30 pl-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
            Coming up
          </p>
          <p className="text-sm text-foreground/60">{content.next_module}</p>
        </div>
      )}
    </div>
  );
}
