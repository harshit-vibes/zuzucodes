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
    <section id="method" className="section bg-warm-gray">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="tag mb-6 inline-block">The Zuzu Method</span>
          <h2 className="text-heading mb-5 text-balance">
            We don&apos;t teach tools. We build instincts.
          </h2>
          <p className="text-body text-[var(--text-medium)] max-w-[600px] mx-auto">
            Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable competence.
          </p>
        </motion.div>

        {/* Quadrant Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="quadrant-grid">
            {quadrants.map((quadrant, i) => (
              <div key={quadrant.title} className="quadrant-cell group">
                <span className="number text-sm mb-4 block opacity-40 group-hover:opacity-100 transition-opacity">
                  0{i + 1}
                </span>
                <h3 className="text-title text-[var(--text-dark)] mb-3 group-hover:text-[var(--gold)] transition-colors">
                  {quadrant.title}
                </h3>
                <p className="text-small text-[var(--text-medium)]">
                  {quadrant.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Why It Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center"
        >
          <h3 className="text-title text-[var(--text-dark)] mb-6">Why this works</h3>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-4 text-[var(--text-medium)]">
            {whyItWorks.map((item, i) => (
              <span key={i} className="text-small flex items-center gap-2 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>

          <p className="mt-10 text-body text-[var(--text-dark)] font-medium">
            Complete the quadrant. Build lasting competence.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
