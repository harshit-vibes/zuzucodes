'use client';

import { motion } from 'motion/react';

const quadrants = [
  {
    position: 'top-left',
    title: 'Core Theory',
    description: 'Principles and mental models that transfer',
    axis: { vertical: 'Theoretical', horizontal: 'Independent' },
  },
  {
    position: 'top-right',
    title: 'Pattern Recognition',
    description: 'Real-world cases with expert analysis',
    axis: { vertical: 'Theoretical', horizontal: 'Guided' },
  },
  {
    position: 'bottom-left',
    title: 'Independent Application',
    description: 'Build it yourself, make mistakes, learn',
    axis: { vertical: 'Applied', horizontal: 'Independent' },
  },
  {
    position: 'bottom-right',
    title: 'Expert Guidance',
    description: 'Feedback and refinement from practitioners',
    axis: { vertical: 'Applied', horizontal: 'Guided' },
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
      <div className="max-w-5xl mx-auto w-full">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <span className="tag mb-6 inline-block">The Zuzu Method</span>
          <h2 className="display-lg mb-4">
            We don&apos;t teach tools. We build instincts.
          </h2>
          <p className="body-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable competence.
          </p>
        </motion.div>

        {/* 2x2 Quadrant Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          {/* Axis labels */}
          <div className="relative">
            {/* Vertical axis label - left side */}
            <div className="hidden md:block absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 origin-center">
              <div className="flex items-center gap-8 text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">
                <span>Applied</span>
                <span className="w-12 h-px bg-[var(--border-default)]" />
                <span>Theoretical</span>
              </div>
            </div>

            {/* Horizontal axis label - top */}
            <div className="hidden md:flex justify-center mb-4 gap-8 text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">
              <span>Independent</span>
              <span className="w-12 h-px bg-[var(--border-default)] mt-2" />
              <span>Guided</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
              {quadrants.map((quadrant, i) => (
                <motion.div
                  key={quadrant.position}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`
                    p-8 md:p-10
                    ${i % 2 === 0 ? 'md:border-r' : ''}
                    ${i < 2 ? 'md:border-b' : ''}
                    border-[var(--border-default)]
                    transition-colors duration-300
                    hover:bg-[var(--bg-primary)]
                    group
                  `}
                >
                  <span className="number text-sm mb-3 block opacity-50 group-hover:opacity-100 transition-opacity">
                    0{i + 1}
                  </span>
                  <h3 className="heading-md text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                    {quadrant.title}
                  </h3>
                  <p className="body-md text-[var(--text-secondary)]">
                    {quadrant.description}
                  </p>
                </motion.div>
              ))}
            </div>
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
          <h3 className="heading-md text-[var(--text-primary)] mb-6">Why this works</h3>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[var(--text-secondary)]">
            {whyItWorks.map((item, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="body-sm flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
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
            className="mt-8 body-lg text-[var(--text-primary)] font-medium"
          >
            Complete the quadrant. Build lasting competence.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
