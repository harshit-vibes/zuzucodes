'use client';

import { motion } from 'motion/react';

export function CTASection() {
  return (
    <section className="section bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Large ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(212,165,116,0.08)_0%,transparent_60%)] blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full text-center relative z-10">
        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif mb-8 leading-tight">
            Start building<br />
            <span className="text-[var(--text-secondary)]">automations today.</span>
          </h2>

          <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-lg mx-auto">
            Join learners mastering the future of workflow automation with AI.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button className="btn-primary">
              Begin Free
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button className="btn-secondary">
              View Curriculum
            </button>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-32 pt-8 border-t border-[var(--border-subtle)]"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-muted)]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-[var(--text-primary)]">
                zuzu<span className="text-[var(--accent)]">.</span>codes
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">
                About
              </a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">
                Contact
              </a>
            </div>

            {/* Copyright */}
            <span>&copy; {new Date().getFullYear()} ZuzuCodes</span>
          </div>
        </motion.footer>
      </div>
    </section>
  );
}
