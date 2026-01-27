'use client';

import { motion } from 'motion/react';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

export function ShiftSection() {
  return (
    <section id="shift" className="section bg-cream">
      <div className="w-full max-w-[720px]">
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <span className="tag">The New Professional Baseline</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-display mb-10 text-balance"
        >
          AI-native upskilling for the modern professional
        </motion.h1>

        {/* Body */}
        <div className="space-y-6">
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
          className="mt-10"
        >
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Contact Us
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
