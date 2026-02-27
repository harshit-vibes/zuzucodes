'use client';

import { motion } from 'motion/react';
import { WHATSAPP_URL } from '@/lib/constants';

export function ShiftSection() {
  return (
    <section id="shift" className="section bg-cream" style={{ position: 'relative' }}>
      {/* Corner decorations */}
      <div className="corner-line tl" aria-hidden="true" />
      <div className="corner-line tr" aria-hidden="true" />
      <div className="corner-line bl" aria-hidden="true" />
      <div className="corner-line br" aria-hidden="true" />

      <div className="w-full max-w-[680px]">
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10"
        >
          <span className="tag">The New Professional Baseline</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-display mb-14 text-balance"
        >
          AI-native upskilling for the modern professional
        </motion.h1>

        {/* Body */}
        <div className="space-y-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-body text-[var(--text-medium)]"
          >
            AI-native tools are no longer optional. They&apos;re the new professional baseline.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-body text-[var(--text-medium)]"
          >
            But there&apos;s a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches{' '}
            <span className="text-[var(--text-dark)] font-medium">AI-native operations thinking</span>{' '}
            — the instinct to identify, design, and manage automated processes.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-body text-[var(--text-medium)]"
          >
            Surface-level tool familiarity isn&apos;t enough. The professionals who master AI-native automation
            management become{' '}
            <span className="text-[var(--gold)] font-medium">force multipliers</span>{' '}
            — personally and organizationally.
          </motion.p>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 flex flex-col sm:flex-row gap-4"
        >
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Get Started
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <button
            onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary"
          >
            View Courses
          </button>
        </motion.div>
      </div>
    </section>
  );
}
