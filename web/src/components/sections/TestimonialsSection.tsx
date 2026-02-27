'use client';

import { motion } from 'motion/react';

const testimonials = [
  {
    quote: "I went from manually processing spreadsheets to fully automated pipelines in 6 weeks. This isn't just a course — it's a mindset shift.",
    name: 'Priya S.',
    role: 'Operations Lead, Mumbai',
  },
  {
    quote: "The Zuzu Method actually sticks. I've done other courses but the instincts I built here transfer to every new tool I pick up.",
    name: 'Arjun M.',
    role: 'Founder, SaaS Startup',
  },
  {
    quote: "As a consultant, being able to design and pitch automation systems changed how clients value my work. ROI was immediate.",
    name: 'Fatima R.',
    role: 'Business Consultant, Bangalore',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section bg-cream">
      <div className="w-full max-w-[1040px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <span className="tag mb-8 inline-block">What students say</span>
          <h2 className="text-heading text-balance">
            Real results from real professionals.
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: testimonials.indexOf(t) * 0.1 }}
              className="card-on-cream flex flex-col"
            >
              {/* Quote mark */}
              <span
                className="text-5xl leading-none text-[var(--gold)] mb-6 opacity-60"
                style={{ fontFamily: 'Instrument Serif, Georgia, serif' }}
                aria-hidden="true"
              >
                &ldquo;
              </span>

              <p className="text-body text-[var(--text-medium)] flex-grow mb-8 italic">
                {t.quote}
              </p>

              <div className="border-t border-[var(--border)] pt-6">
                <p className="text-title font-medium text-[var(--text-dark)]">{t.name}</p>
                <p className="text-small text-[var(--text-light)] mt-1">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
