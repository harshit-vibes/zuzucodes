'use client';

import { motion } from 'motion/react';

export function ShiftSection() {
  return (
    <section id="shift" className="section bg-[var(--bg-primary)]">
      <div className="max-w-[800px] mx-auto w-full">
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <span className="tag">The New Professional Baseline</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="display-xl mb-12 text-balance"
        >
          AI-native upskilling for the modern professional
        </motion.h1>

        {/* Body paragraphs */}
        <div className="space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="body-lg text-[var(--text-secondary)]"
          >
            AI-native tools are no longer optional. They&apos;re the new professional baseline.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="body-lg text-[var(--text-secondary)]"
          >
            But there&apos;s a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches{' '}
            <span className="text-[var(--text-primary)] font-medium">AI-native operations thinking</span>{' '}
            — the instinct to identify, design, and manage automated processes.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="body-lg text-[var(--text-secondary)]"
          >
            Surface-level tool familiarity isn&apos;t enough. The professionals who master AI-native automation
            management become{' '}
            <span className="text-[var(--accent)] font-medium">force multipliers</span>{' '}
            — personally and organizationally.
          </motion.p>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          <a
            href="https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Contact Us
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
