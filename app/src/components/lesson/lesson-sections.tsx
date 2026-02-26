'use client';

import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';

interface LessonSectionsProps {
  sections: DbLessonSection[];
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[10px] bg-muted/50 text-muted-foreground/50 px-1.5 py-0.5 rounded">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

export function LessonSections({ sections }: LessonSectionsProps) {
  if (sections.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      {sections.map((section, i) => (
        <div key={section.id} className="mb-12">
          <SectionDivider label={String(i + 1).padStart(2, '0')} />
          {renderTemplate(section.template as TemplateName, section.content)}
        </div>
      ))}
    </div>
  );
}
