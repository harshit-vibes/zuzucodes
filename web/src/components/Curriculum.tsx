'use client';

import { useState } from 'react';
import { ModuleWithLessons } from '@/types/course';
import FadeContent from '@/components/FadeContent';

interface CurriculumProps {
  modules: ModuleWithLessons[];
}

export function Curriculum({ modules }: CurriculumProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.moduleId || null);

  const toggleModule = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <section className="relative py-32 px-6 bg-[var(--bg-primary)]">
      {/* Subtle ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle,rgba(212,165,116,0.02)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Section header */}
        <FadeContent duration={800}>
          <div className="mb-16 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="line-accent" />
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">Curriculum</span>
              <div className="line-accent" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-[var(--text-primary)] mb-4">
              Course Structure
            </h2>
            <p className="text-[var(--text-secondary)]">
              {modules.length} modules &middot; {totalLessons} lessons
            </p>
          </div>
        </FadeContent>

        {/* Modules list */}
        <div className="space-y-3">
          {modules.map((module, index) => (
            <FadeContent key={module.moduleId} duration={800} delay={index * 100}>
              <ModuleCard
                module={module}
                index={index}
                isExpanded={expandedModule === module.moduleId}
                onToggle={() => toggleModule(module.moduleId)}
              />
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ModuleCardProps {
  module: ModuleWithLessons;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function ModuleCard({ module, index, isExpanded, onToggle }: ModuleCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] transition-all duration-300"
      style={{
        borderColor: isExpanded ? 'var(--border-hover)' : 'var(--border-subtle)',
      }}
    >
      {/* Module header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Module number */}
          <span className="number-badge">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="text-left">
            <h3 className="font-medium text-[var(--text-primary)]">{module.title}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {module.lessons.length} lessons &middot; {module.duration}
            </p>
          </div>
        </div>

        {/* Expand icon */}
        <div
          className="w-8 h-8 rounded-full border border-[var(--border-subtle)] flex items-center justify-center transition-all duration-300"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            backgroundColor: isExpanded ? 'var(--accent-soft)' : 'transparent',
            borderColor: isExpanded ? 'var(--accent-primary)' : 'var(--border-subtle)',
          }}
        >
          <svg
            className="w-4 h-4 text-[var(--text-muted)]"
            style={{ color: isExpanded ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Module content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isExpanded ? '800px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {/* Description */}
        {module.description && (
          <div className="px-6 py-4 border-t border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-secondary)]">{module.description}</p>
          </div>
        )}

        {/* Lessons list */}
        <div className="border-t border-[var(--border-subtle)]">
          {module.lessons.map((lesson, lessonIndex) => (
            <div
              key={lesson.lessonId}
              className="group flex items-center gap-4 px-6 py-4 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            >
              {/* Lesson number */}
              <span className="text-xs font-mono text-[var(--text-muted)] w-5">
                {String(lessonIndex + 1).padStart(2, '0')}
              </span>

              {/* Lesson title */}
              <span className="flex-1 text-[var(--text-primary)] text-sm group-hover:text-[var(--accent-primary)] transition-colors">
                {lesson.title}
              </span>

              {/* Play icon */}
              <svg
                className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
