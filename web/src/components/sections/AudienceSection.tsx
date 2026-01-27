'use client';

import { motion } from 'motion/react';

const audiences = [
  {
    title: 'Career-focused professionals',
    description: 'seeking AI-native skills that compound over time.',
  },
  {
    title: 'Founders and operators',
    description: 'who treat productivity as competitive advantage.',
  },
  {
    title: 'Team leads',
    description: 'building automation-first cultures.',
  },
  {
    title: 'Consultants',
    description: 'adding process optimization to their practice.',
  },
];

export function AudienceSection() {
  return (
    <section id="audience" className="section bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto w-full">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="tag mb-6 inline-block">Who This Is For</span>
          <h2 className="display-lg">
            Built for professionals who want more.
          </h2>
        </motion.div>

        {/* Audience items - vertical stack */}
        <div className="space-y-8">
          {audiences.map((audience, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group"
            >
              <div className="flex items-start gap-6">
                {/* Number */}
                <span className="number text-2xl opacity-30 group-hover:opacity-100 transition-opacity pt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Content */}
                <div className="flex-1">
                  <p className="body-lg">
                    <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {audience.title}
                    </span>{' '}
                    <span className="text-[var(--text-secondary)]">
                      {audience.description}
                    </span>
                  </p>
                </div>
              </div>

              {/* Divider */}
              {i < audiences.length - 1 && (
                <div className="mt-8 ml-14 h-px bg-[var(--border-default)]" />
              )}
            </motion.div>
          ))}
        </div>

        {/* MBA parallel statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 pt-8 border-t border-[var(--border-default)]"
        >
          <p className="font-serif text-xl md:text-2xl italic text-[var(--text-secondary)] leading-relaxed text-center">
            Like an MBA provides frameworks for business thinking, this curriculum provides frameworks for{' '}
            <span className="text-[var(--accent)]">AI-native operations thinking</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
