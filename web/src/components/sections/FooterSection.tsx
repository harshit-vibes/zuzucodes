'use client';

import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

export function FooterSection() {
  return (
    <section id="footer" className="section bg-[var(--bg-surface)]">
      <div className="max-w-[640px] mx-auto w-full text-center">
        {/* About content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="tag mb-[var(--tag-mb)] inline-block">About</span>

          {/* Body paragraphs - consistent spacing */}
          <div className="space-y-[var(--paragraph-gap)] mb-[var(--section-header-mb)]">
            <p className="body-lg text-[var(--text-secondary)]">
              The gap between &quot;knowing about AI tools&quot; and &quot;being AI-native&quot; is growing.
            </p>

            <p className="body-lg text-[var(--text-secondary)]">
              Tutorials teach features. Bootcamps teach syntax. Neither builds operational instincts.
            </p>

            <p className="body-lg text-[var(--text-primary)]">
              We built zuzu.codes to close that gap — with MBA-level rigor applied to AI-native upskilling.
            </p>
          </div>

          {/* Promise - using Card component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-[var(--section-header-mb)]"
          >
            <Card padding="lg" context="on-surface">
              <p className="font-serif text-xl italic text-[var(--text-primary)] leading-relaxed">
                &quot;Complete the quadrant with genuine effort, and you&apos;ll emerge AI-native — with instincts that{' '}
                <span className="text-[var(--accent)]">compound across your entire career</span>.&quot;
              </p>
            </Card>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mb-20"
          >
            <a
              href={WHATSAPP_URL}
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
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-8 border-t border-[var(--border-default)]"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-muted)]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-[var(--text-primary)]">
                zuzu<span className="text-[var(--accent)]">.</span>codes
              </span>
            </div>

            {/* Contact */}
            <a
              href="mailto:hello@zuzu.codes"
              className="link text-[var(--text-secondary)]"
            >
              hello@zuzu.codes
            </a>

            {/* Copyright */}
            <span>&copy; {new Date().getFullYear()} ZuzuCodes</span>
          </div>
        </motion.footer>
      </div>
    </section>
  );
}
