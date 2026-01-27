'use client';

import { motion } from 'motion/react';

interface OutcomesSectionProps {
  outcomes: string[];
}

const outcomeDescriptions = [
  'Design and implement end-to-end automation pipelines that save hours of manual work.',
  'Work with any API, transform data between formats, and chain operations seamlessly.',
  'Build resilient workflows that recover gracefully and keep you informed.',
  'Ship workflows that scale reliably and run 24/7 without intervention.',
];

export function OutcomesSection({ outcomes }: OutcomesSectionProps) {
  return (
    <section className="section bg-[var(--bg-surface)]">
      <div className="max-w-5xl mx-auto w-full">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-[var(--accent)]" />
            <span className="text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">
              What you&apos;ll learn
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-serif leading-tight">
            What You&apos;ll Master
          </h2>
        </motion.div>

        {/* Outcomes list */}
        <div className="space-y-12">
          {outcomes.map((outcome, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group"
            >
              <div className="flex items-start gap-8">
                {/* Number */}
                <motion.span
                  className="number text-4xl md:text-5xl font-light opacity-30 group-hover:opacity-100 transition-opacity duration-500"
                  whileHover={{ scale: 1.1 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </motion.span>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl md:text-3xl font-serif text-[var(--text-primary)] mb-3 group-hover:text-[var(--accent)] transition-colors duration-300">
                    {outcome}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-2xl">
                    {outcomeDescriptions[i]}
                  </p>
                </div>
              </div>

              {/* Divider */}
              {i < outcomes.length - 1 && (
                <div className="mt-12 h-px bg-[var(--border-subtle)]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
