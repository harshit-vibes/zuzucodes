'use client';

import { useState, useEffect, useRef } from 'react';
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
}: LessonSectionsProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id ?? 'section-0',
  );
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = (entry.target as HTMLElement).dataset.sectionId;
            if (sectionId) {
              setActiveSectionId(sectionId);
            }
          }
        }
      },
      { root, threshold: [0.5] },
    );

    for (const el of sectionRefs.current.values()) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  // KaTeX fade-in animation: apply section-entering class when active section changes
  useEffect(() => {
    const el = sectionRefs.current.get(activeSectionId);
    if (!el) return;
    el.classList.add('section-entering');
    const timer = setTimeout(() => el.classList.remove('section-entering'), 600);
    return () => {
      clearTimeout(timer);
      el.classList.remove('section-entering');
    };
  }, [activeSectionId]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto relative"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.id}
          data-section-id={section.id}
          ref={(el) => {
            if (el) sectionRefs.current.set(section.id, el);
            else sectionRefs.current.delete(section.id);
          }}
          className="flex flex-col overflow-y-auto px-8 pt-8 pb-12"
          style={{ scrollSnapAlign: 'start', height: '100%', flexShrink: 0 }}
        >
          {section.isProblemSection ? (
            // Problem section
            <div className="space-y-2">
              <h2 className="font-mono text-xs text-muted-foreground/50 uppercase tracking-wider mb-4">
                challenge
              </h2>
              {problemSummary && (
                <ProblemPanel
                  problemSummary={problemSummary}
                  problemConstraints={problemConstraints}
                  problemHints={problemHints}
                  testCases={testCases}
                  entryPoint={entryPoint}
                />
              )}
            </div>
          ) : (
            // Theory section
            <>
              {section.markdownBefore && (
                <div className="prose-container">
                  <Markdown content={section.markdownBefore} />
                </div>
              )}

              {section.codeBlock && (
                <AnimatedCodeBlock
                  current={section.codeBlock}
                  previous={sections[sectionIndex - 1]?.codeBlock ?? null}
                  isActive={activeSectionId === section.id}
                />
              )}

              {section.markdownAfter && (
                <div className="prose-container">
                  <Markdown content={section.markdownAfter} />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {/* Section dot navigation */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10 pointer-events-auto">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() =>
              sectionRefs.current.get(s.id)?.scrollIntoView({ behavior: 'smooth' })
            }
            className={cn(
              'rounded-full transition-all duration-300',
              activeSectionId === s.id
                ? 'w-1.5 h-5 bg-primary'
                : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
            )}
            title={s.isProblemSection ? 'Challenge' : `Section ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
