'use client';

import { motion } from 'motion/react';

const audiences = [
  { title: 'Career-focused professionals', description: 'seeking AI-native skills that compound over time.' },
  { title: 'Founders and operators', description: 'who treat productivity as competitive advantage.' },
  { title: 'Team leads', description: 'building automation-first cultures.' },
  { title: 'Consultants', description: 'adding process optimization to their practice.' },
];

export function AudienceSection() {
  return (
    <section id="audience" className="section bg-cream">
      <div className="w-full max-w-[640px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <span className="tag mb-10 inline-block">Who This Is For</span>
          <h2 className="text-heading text-balance">
            Built for professionals who want more.
          </h2>
        </motion.div>

        {/* Audience items */}
        <div className="space-y-10">
          {audiences.map((audience, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <span className="number text-xl sm:text-2xl opacity-30 group-hover:opacity-100 transition-opacity pt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <p className="text-body">
                    <span className="font-medium text-[var(--text-dark)] group-hover:text-[var(--gold)] transition-colors">
                      {audience.title}
                    </span>{' '}
                    <span className="text-[var(--text-medium)]">{audience.description}</span>
                  </p>
                </div>
              </div>
              {i < audiences.length - 1 && (
                <div className="mt-10 ml-10 sm:ml-14 h-px bg-[var(--border)]" />
              )}
            </motion.div>
          ))}
        </div>

        {/* MBA parallel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 pt-12 border-t border-[var(--border)]"
        >
          <p className="font-serif text-lg sm:text-xl md:text-2xl italic text-[var(--text-medium)] leading-relaxed text-center">
            Like an MBA provides frameworks for business thinking, this curriculum provides frameworks for{' '}
            <span className="text-[var(--gold)]">AI-native operations thinking</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
