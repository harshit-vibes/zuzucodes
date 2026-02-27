'use client';

import { motion } from 'motion/react';

const stats = [
  { number: '500+', label: 'Students enrolled' },
  { number: '90%', label: 'Completion rate' },
  { number: '12h+', label: 'Course content' },
  { number: '2', label: 'AI courses' },
];

export function StatsSection() {
  return (
    <section id="stats" className="section bg-cream">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="tag mb-8 inline-block">The numbers</span>
          <h2 className="text-heading text-balance">
            Professionals who commit, progress.
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-[var(--cream)] flex flex-col items-center justify-center py-12 px-6 text-center"
            >
              <span
                className="text-[var(--gold)] mb-3 font-serif"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1 }}
              >
                {stat.number}
              </span>
              <span className="text-small text-[var(--text-medium)] uppercase tracking-wide">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
