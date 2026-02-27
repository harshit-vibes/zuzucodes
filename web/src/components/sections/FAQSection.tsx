'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

const faqs = [
  {
    question: 'Do I need prior coding experience?',
    answer: "No. The curriculum is designed for professionals, not developers. You'll learn to think in automation patterns and use no-code/low-code tools effectively.",
  },
  {
    question: 'How long does each course take?',
    answer: "Each course is 6–8 weeks at roughly 3–5 hours per week. The content is designed to be applied immediately at work, so learning and applying happen in parallel.",
  },
  {
    question: "What's the difference between the pricing tiers?",
    answer: "Essential is self-paced with community support. Pro adds live sessions and structured exercises with instructor feedback. Premium includes 1:1 mentorship and a personalized learning path.",
  },
  {
    question: 'Will I get a certificate?',
    answer: "Yes. Completing each course earns a zuzu.codes completion certificate. Pro and Premium tiers include a practitioner credential you can share on LinkedIn.",
  },
  {
    question: 'Can my company sponsor my enrollment?',
    answer: "Absolutely. We offer team pricing and corporate billing. Reach out via WhatsApp and we'll put together a proposal for your organization.",
  },
  {
    question: 'What tools will I learn to use?',
    answer: "The curriculum focuses on concepts and patterns that transfer across tools. You'll build fluency with modern automation platforms (n8n, Zapier, Make) plus AI-native tools used in professional workflows.",
  },
];

function FAQItem({ faq, index }: { faq: { question: string; answer: string }; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="accordion-item"
      data-state={open ? 'open' : 'closed'}
    >
      <button className="accordion-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="text-title text-[var(--text-dark)] text-left pr-4">{faq.question}</span>
        <span className="accordion-icon flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            )}
          </svg>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="accordion-content">
              <p className="text-body text-[var(--text-medium)]">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="section bg-warm-gray">
      <div className="w-full max-w-[1000px]">
        {/* Desktop: two-column. Mobile: stacked. */}
        <div className="flex flex-col lg:flex-row lg:gap-20">
          {/* Left: heading */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="lg:w-2/5 mb-12 lg:mb-0 lg:sticky lg:top-28 self-start"
          >
            <span className="tag mb-8 inline-block">Common questions</span>
            <h2 className="text-heading mb-6 text-balance">
              Everything you need to know.
            </h2>
            <p className="text-body text-[var(--text-medium)]">
              Still have questions? Reach out on WhatsApp — we respond within a few hours.
            </p>
          </motion.div>

          {/* Right: accordion */}
          <div className="lg:w-3/5 space-y-4">
            {faqs.map((faq, i) => (
              <FAQItem key={faq.question} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
