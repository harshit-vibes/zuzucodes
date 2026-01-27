'use client';

import { motion } from 'motion/react';

interface Module {
  number: string;
  title: string;
  subtitle: string;
  duration: string;
  lessons: string[];
}

interface CurriculumSectionProps {
  modules: Module[];
}

export function CurriculumSection({ modules }: CurriculumSectionProps) {
  return (
    <section className="section bg-[var(--bg-primary)]">
      {/* Ambient glow */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(212,165,116,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-px bg-[var(--accent)]" />
            <span className="text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">
              The Curriculum
            </span>
            <div className="w-12 h-px bg-[var(--accent)]" />
          </div>
          <h2 className="text-4xl md:text-6xl font-serif mb-4">
            Your Learning Path
          </h2>
          <p className="text-[var(--text-secondary)] text-lg">
            From zero to production-ready in two focused modules
          </p>
        </motion.div>

        {/* Module cards - side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module, moduleIndex) => (
            <motion.div
              key={module.number}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.8,
                delay: moduleIndex * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -8 }}
              className="card group cursor-pointer"
            >
              {/* Module header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <span className="number text-sm mb-2 block">
                    Module {module.number}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {module.title}
                  </h3>
                  <span className="text-sm text-[var(--text-muted)] mt-1 block">
                    {module.subtitle}
                  </span>
                </div>
                <span className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] px-3 py-1 rounded-full">
                  {module.duration}
                </span>
              </div>

              {/* Lessons */}
              <div className="space-y-0">
                {module.lessons.map((lesson, lessonIndex) => (
                  <motion.div
                    key={lessonIndex}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: moduleIndex * 0.1 + lessonIndex * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-center gap-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 group/lesson"
                  >
                    <span className="text-xs font-mono text-[var(--text-muted)] w-6">
                      {String(lessonIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[var(--text-secondary)] group-hover/lesson:text-[var(--text-primary)] transition-colors">
                      {lesson}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Hover indicator */}
              <motion.div
                className="mt-6 flex items-center gap-2 text-sm text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span>View module</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
