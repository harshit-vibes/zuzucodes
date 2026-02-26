'use client';

import { ProblemPanel } from '@/components/lesson/problem-panel';
import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';
import type { TestCase } from '@/lib/judge0';

interface LessonSectionsProps {
  introContent: unknown | null;
  sections: DbLessonSection[];
  outroContent: unknown | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/20" />
    </div>
  );
}

export function LessonSections({
  introContent,
  sections,
  outroContent,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: LessonSectionsProps) {
  const hasContent =
    introContent !== null ||
    sections.length > 0 ||
    outroContent !== null ||
    !!problemSummary;

  if (!hasContent) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
      {introContent !== null && (
        <div className="mb-12">
          <SectionDivider label="intro" />
          {renderTemplate('lesson-intro', introContent)}
        </div>
      )}

      {sections.map((section, i) => (
        <div key={section.id} className="mb-12">
          <SectionDivider label={String(i + 1).padStart(2, '0')} />
          {renderTemplate(section.template as TemplateName, section.content)}
        </div>
      ))}

      {outroContent !== null && (
        <div className="mb-12">
          <SectionDivider label="outro" />
          {renderTemplate('lesson-outro', outroContent)}
        </div>
      )}

      {problemSummary && (
        <div className="mb-12">
          <SectionDivider label="challenge" />
          <ProblemPanel
            problemSummary={problemSummary}
            problemConstraints={problemConstraints}
            problemHints={problemHints}
            testCases={testCases}
            entryPoint={entryPoint}
          />
        </div>
      )}
    </div>
  );
}
