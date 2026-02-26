'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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

type NavItem =
  | { kind: 'intro' }
  | { kind: 'section'; section: DbLessonSection }
  | { kind: 'outro' }
  | { kind: 'challenge' };

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
  // Build ordered nav items
  const navItems: NavItem[] = [];
  if (introContent !== null) navItems.push({ kind: 'intro' });
  for (const section of sections) navItems.push({ kind: 'section', section });
  if (outroContent !== null) navItems.push({ kind: 'outro' });
  if (problemSummary) navItems.push({ kind: 'challenge' });

  const [activeIndex, setActiveIndex] = useState(0);

  const navigateTo = (index: number) => {
    if (index < 0 || index >= navItems.length || index === activeIndex) return;
    setActiveIndex(index);
  };

  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= navItems.length - 1;
  const active = navItems[activeIndex];

  function dotLabel(item: NavItem, i: number): string {
    if (item.kind === 'intro') return 'Intro';
    if (item.kind === 'outro') return 'Outro';
    if (item.kind === 'challenge') return 'Challenge';
    return `Section ${i + 1}`;
  }

  function renderActive(item: NavItem) {
    if (item.kind === 'intro') {
      return renderTemplate('lesson-intro', introContent);
    }
    if (item.kind === 'outro') {
      return renderTemplate('lesson-outro', outroContent);
    }
    if (item.kind === 'challenge') {
      return problemSummary ? (
        <ProblemPanel
          problemSummary={problemSummary}
          problemConstraints={problemConstraints}
          problemHints={problemHints}
          testCases={testCases}
          entryPoint={entryPoint}
        />
      ) : null;
    }
    // section
    return renderTemplate(item.section.template as TemplateName, item.section.content);
  }

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col">
      {/* Up arrow */}
      <button
        onClick={() => navigateTo(activeIndex - 1)}
        disabled={isFirst}
        aria-label="Previous section"
        className={cn(
          'shrink-0 h-8 w-full flex items-center justify-center',
          'text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-200',
          isFirst ? 'opacity-0 pointer-events-none' : '',
        )}
      >
        <ChevronUp className="w-5 h-5 stroke-[1.5]" />
      </button>

      {/* Middle: dots + content */}
      <div className="flex-1 min-h-0 relative">
        {/* Dots */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
          {navItems.map((item, i) => (
            <button
              key={item.kind === 'section' ? item.section.id : item.kind}
              onClick={() => navigateTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                activeIndex === i
                  ? 'w-1.5 h-5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
              )}
              title={dotLabel(item, i)}
            />
          ))}
        </div>

        {/* Empty state */}
        {navItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-muted-foreground/30">No content</span>
          </div>
        )}

        {/* Content */}
        {active && (
          <div className="absolute inset-0 overflow-y-auto px-8 pt-8 pb-12">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                {active.kind === 'intro'
                  ? 'intro'
                  : active.kind === 'outro'
                  ? 'outro'
                  : active.kind === 'challenge'
                  ? 'challenge'
                  : String(activeIndex + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 h-px bg-border/20" />
            </div>

            {renderActive(active)}
          </div>
        )}
      </div>

      {/* Down arrow */}
      <button
        onClick={() => navigateTo(activeIndex + 1)}
        disabled={isLast}
        aria-label="Next section"
        className={cn(
          'shrink-0 h-8 w-full flex items-center justify-center',
          'text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-200',
          isLast ? 'opacity-0 pointer-events-none' : '',
        )}
      >
        <ChevronDown className="w-5 h-5 stroke-[1.5]" />
      </button>
    </div>
  );
}
