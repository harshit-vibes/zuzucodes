'use client';

import { motion } from 'motion/react';

const quadrants = [
  { title: 'Core Theory', description: 'Principles and mental models that transfer' },
  { title: 'Pattern Recognition', description: 'Real-world cases with expert analysis' },
  { title: 'Independent Application', description: 'Build it yourself, make mistakes, learn' },
  { title: 'Expert Guidance', description: 'Feedback and refinement from practitioners' },
];

const whyItWorks = [
  'Theory without application fades.',
  'Application without theory is imitation.',
  'Independence without guidance plateaus.',
  'Guidance without independence creates dependency.',
];

export function MethodSection() {
  return (
    <section id="method" className="section bg-cream">
      <div className="w-full max-w-[1000px]">
        {/* Desktop: two-column. Mobile: stacked */}
        <div className="flex flex-col lg:flex-row lg:gap-16 lg:items-center">
          {/* Left: heading + why-it-works */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="lg:w-2/5 mb-12 lg:mb-0"
          >
            <span className="tag mb-8 inline-block">The Zuzu Method</span>
            <h2 className="text-heading mb-8 text-balance">
              We don&apos;t teach tools. We build instincts.
            </h2>
            <p className="text-body text-[var(--text-medium)] mb-10">
              Every topic traverses four quadrants — a complete learning cycle that produces
              deep, transferable competence.
            </p>

            {/* Why it works */}
            <div className="space-y-3">
              {whyItWorks.map((item) => (
                <div key={item} className="flex items-center gap-3 text-small text-[var(--text-medium)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-10 text-body text-[var(--text-dark)] font-medium">
              Complete the quadrant. Build lasting competence.
            </p>
          </motion.div>

          {/* Right: quadrant grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-3/5"
          >
            <div className="quadrant-grid">
              {quadrants.map((quadrant, i) => (
                <div key={quadrant.title} className="quadrant-cell group">
                  <span className="number text-sm mb-6 block opacity-40 group-hover:opacity-100 transition-opacity">
                    0{i + 1}
                  </span>
                  <h3 className="text-title text-[var(--text-dark)] mb-4 group-hover:text-[var(--gold)] transition-colors">
                    {quadrant.title}
                  </h3>
                  <p className="text-small text-[var(--text-medium)]">
                    {quadrant.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
