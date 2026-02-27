'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';

interface LessonSectionsProps {
  sections: DbLessonSection[];
}

export function LessonSections({ sections }: LessonSectionsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (sections.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground/30">No content</span>
      </div>
    );
  }

  const navigateTo = (index: number) => {
    if (index < 0 || index >= sections.length || index === activeIndex) return;
    setActiveIndex(index);
  };

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < sections.length - 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Up arrow */}
      <button
        onClick={() => navigateTo(activeIndex - 1)}
        disabled={!canGoPrev}
        className="shrink-0 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:cursor-default"
        aria-label="Previous section"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Middle: dots + fading content */}
      <div className="flex-1 min-h-0 relative">
        {/* Section dots — fixed position in the middle */}
        {sections.length > 1 && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
            {sections.map((_, i) => (
              <button
                key={i}
                onClick={() => navigateTo(i)}
                aria-label={`Go to section ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                  i === activeIndex
                    ? 'bg-primary scale-125'
                    : 'bg-border hover:bg-muted-foreground/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Fading section content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-y-auto px-8 py-6"
          >
            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                {String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
              </span>
              <div className="flex-1 h-px bg-border/20" />
            </div>

            {renderTemplate(sections[activeIndex].template as TemplateName, sections[activeIndex].content)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Down arrow */}
      <button
        onClick={() => navigateTo(activeIndex + 1)}
        disabled={!canGoNext}
        className="shrink-0 h-8 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-0 disabled:cursor-default"
        aria-label="Next section"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
