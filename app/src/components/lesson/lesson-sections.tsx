'use client';

import { useState } from 'react';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/shared/markdown';
import { AnimatedCodeBlock } from '@/components/lesson/animated-code-block';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import type { LessonSection } from '@/lib/parse-lesson-sections';
import type { TestCase } from '@/lib/judge0';

interface LessonSectionsProps {
  sections: LessonSection[];
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
  lessonId: string;
}

export function LessonSections({
  sections,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lessonId: _lessonId,
}: LessonSectionsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const navigateTo = (index: number) => {
    if (index < 0 || index >= sections.length || index === activeIndex) return;
    setActiveIndex(index);
  };

  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= sections.length - 1;
  const activeSection = sections[activeIndex];

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

      {/* Middle area: dots pinned left, fading content right */}
      <div className="flex-1 min-h-0 relative">

        {/* Dots — fixed position, never fade */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => navigateTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                activeIndex === i
                  ? 'w-1.5 h-5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
              )}
              title={s.isProblemSection ? 'Challenge' : `Section ${i + 1}`}
            />
          ))}
        </div>

        {/* Fading content area */}
        <>
          {activeSection && (
            <div className="absolute inset-0 overflow-y-auto px-8 pt-8 pb-12">
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  {activeSection.isProblemSection ? 'challenge' : String(activeIndex + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 h-px bg-border/20" />
              </div>

              {activeSection.isProblemSection ? (
                problemSummary ? (
                  <ProblemPanel
                    problemSummary={problemSummary}
                    problemConstraints={problemConstraints}
                    problemHints={problemHints}
                    testCases={testCases}
                    entryPoint={entryPoint}
                  />
                ) : null
              ) : (
                <>
                  {activeSection.markdownBefore && (
                    <div className="prose-container">
                      <Markdown content={activeSection.markdownBefore} />
                    </div>
                  )}
                  {activeSection.codeBlock && (
                    <AnimatedCodeBlock
                      current={activeSection.codeBlock}
                      previous={sections[activeIndex - 1]?.codeBlock ?? null}
                      isActive={true}
                    />
                  )}
                  {activeSection.markdownAfter && (
                    <div className="prose-container">
                      <Markdown content={activeSection.markdownAfter} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
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
