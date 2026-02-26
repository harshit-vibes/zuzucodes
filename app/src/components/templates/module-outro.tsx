'use client';

import { ArrowRight } from 'lucide-react';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-outro'>;
}

export function ModuleOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_module ? (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
              Coming up
            </p>
            <p className="text-sm text-foreground/70">{content.next_module}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
        </div>
      ) : null}
    </div>
  );
}
