'use client';

import { motion } from 'motion/react';
import { SectionHeader } from '@/components/ui/SectionHeader';

const quadrants = [
  {
    title: 'Core Theory',
    description: 'Principles and mental models that transfer',
  },
  {
    title: 'Pattern Recognition',
    description: 'Real-world cases with expert analysis',
  },
  {
    title: 'Independent Application',
    description: 'Build it yourself, make mistakes, learn',
  },
  {
    title: 'Expert Guidance',
    description: 'Feedback and refinement from practitioners',
  },
];

const whyItWorks = [
  'Theory without application fades.',
  'Application without theory is imitation.',
  'Independence without guidance plateaus.',
  'Guidance without independence creates dependency.',
];

export function MethodSection() {
  return (
    <section id="method" className="section bg-[var(--bg-surface)]">
      <div className="w-full max-w-[900px]">
        {/* Section header - using standardized component */}
        <SectionHeader
          tag="The Zuzu Method"
          headline="We don't teach tools. We build instincts."
          description="Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable competence."
          align="center"
        />

        {/* 2x2 Quadrant Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-[var(--section-header-mb)]"
        >
          <div className="quadrant-grid">
            {quadrants.map((quadrant, i) => (
              <motion.div
                key={quadrant.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: 0.3 + i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="quadrant-cell group"
              >
                <span className="number text-sm mb-4 block opacity-40 group-hover:opacity-100 transition-opacity">
                  0{i + 1}
                </span>
                <h3 className="heading-md text-[var(--text-primary)] mb-3 group-hover:text-[var(--accent)] transition-colors">
                  {quadrant.title}
                </h3>
                <p className="body-md text-[var(--text-secondary)]">
                  {quadrant.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Why It Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h3 className="heading-md text-[var(--text-primary)] mb-[var(--tag-mb)]">Why this works</h3>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-4 text-[var(--text-secondary)]">
            {whyItWorks.map((item, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="body-sm flex items-center gap-2 justify-center"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                {item}
              </motion.span>
            ))}
          </div>

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-[var(--content-gap)] body-lg text-[var(--text-primary)] font-medium"
          >
            Complete the quadrant. Build lasting competence.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
