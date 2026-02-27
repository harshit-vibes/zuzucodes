'use client';

import { motion } from 'motion/react';

const credentials = [
  '10+ years in enterprise operations and process design',
  'Built automation systems serving 50,000+ daily users',
  'Former consultant at Fortune 500 companies',
  'Certified AI practitioner and workflow architect',
];

export function InstructorSection() {
  return (
    <section id="instructor" className="section bg-warm-gray">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <span className="tag mb-8 inline-block">Your instructor</span>
          <h2 className="text-heading text-balance">
            Learn from someone who&apos;s built it in production.
          </h2>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-start">
          {/* Left: Avatar + name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center md:items-start text-center md:text-left flex-shrink-0"
          >
            {/* Avatar placeholder */}
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-6 border-2 border-[var(--gold)]"
              style={{ background: 'var(--gold-soft)' }}
            >
              <span
                className="text-4xl font-medium text-[var(--gold)]"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif' }}
              >
                K
              </span>
            </div>
            <h3
              className="text-subhead text-[var(--gold)] mb-1"
            >
              Kuma
            </h3>
            <p className="text-small text-[var(--text-medium)]">Founder, Kuma Learn</p>
            <p className="text-small text-[var(--text-light)] mt-1">AI Automation Practitioner</p>
          </motion.div>

          {/* Right: Bio + credentials */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex-1"
          >
            <p className="text-body text-[var(--text-medium)] mb-8">
              I&apos;ve spent a decade designing automation systems for businesses — from scrappy
              startups to global enterprises. I built zuzu.codes because most learning resources
              teach you to copy workflows, not to think in workflows. This curriculum is everything
              I wish I had when I started.
            </p>

            <div className="space-y-4">
              {credentials.map((cred) => (
                <div key={cred} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0 mt-2" />
                  <span className="text-small text-[var(--text-medium)]">{cred}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
