'use client';

import { motion } from 'motion/react';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

export function FooterSection() {
  return (
    <section id="footer" className="section bg-warm-gray">
      <div className="max-w-[640px] mx-auto w-full text-center">
        {/* About content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <span className="tag mb-8 inline-block">About</span>

          {/* Body */}
          <div className="space-y-6 mb-14">
            <p className="text-body text-[var(--text-medium)]">
              The gap between &quot;knowing about AI tools&quot; and &quot;being AI-native&quot; is growing.
            </p>
            <p className="text-body text-[var(--text-medium)]">
              Tutorials teach features. Bootcamps teach syntax. Neither builds operational instincts.
            </p>
            <p className="text-body text-[var(--text-dark)]">
              We built zuzu.codes to close that gap — with MBA-level rigor applied to AI-native upskilling.
            </p>
          </div>

          {/* Promise quote - uses card-on-gray since section is warm-gray */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-14"
          >
            <div className="card-on-gray p-8 sm:p-10">
              <p className="font-serif text-xl italic text-[var(--text-dark)] leading-relaxed">
                &quot;Complete the quadrant with genuine effort, and you&apos;ll emerge AI-native — with instincts that{' '}
                <span className="text-[var(--gold)]">compound across your entire career</span>.&quot;
              </p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-20"
          >
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Contact Us
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          className="pt-8 border-t border-[var(--border)]"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-light)]">
            <span className="text-lg font-medium text-[var(--text-dark)]">
              zuzu<span className="text-[var(--gold)]">.</span>codes
            </span>
            <a href="mailto:hello@zuzu.codes" className="link text-[var(--text-medium)]">
              hello@zuzu.codes
            </a>
            <span>&copy; {new Date().getFullYear()} ZuzuCodes</span>
          </div>
        </motion.footer>
      </div>
    </section>
  );
}
