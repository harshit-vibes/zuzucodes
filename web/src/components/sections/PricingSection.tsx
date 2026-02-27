'use client';

import { motion } from 'motion/react';

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

const tiers = [
  {
    name: 'Essential',
    description: 'Self-paced learning with community support',
    price: null,
    featured: false,
    features: [
      { quadrant: 'Core Theory', value: 'Self-paced' },
      { quadrant: 'Pattern Recognition', value: 'Library access' },
      { quadrant: 'Independent Application', value: 'Self-directed' },
      { quadrant: 'Expert Guidance', value: 'Community' },
    ],
  },
  {
    name: 'Pro',
    description: 'Enhanced learning with live instruction',
    price: '₹3,000',
    featured: true,
    features: [
      { quadrant: 'Core Theory', value: 'Enhanced materials' },
      { quadrant: 'Pattern Recognition', value: '+ Live sessions' },
      { quadrant: 'Independent Application', value: '+ Structured exercises' },
      { quadrant: 'Expert Guidance', value: '+ Instructor-led' },
    ],
  },
  {
    name: 'Premium',
    description: 'Deep, personalized learning experience',
    price: null,
    featured: false,
    features: [
      { quadrant: 'Core Theory', value: 'Deep dive content' },
      { quadrant: 'Pattern Recognition', value: '+ Expert commentary' },
      { quadrant: 'Independent Application', value: '+ Personalized path' },
      { quadrant: 'Expert Guidance', value: '+ 1:1 mentorship' },
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section bg-cream">
      <div className="w-full max-w-[1040px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="tag mb-10 inline-block">Pricing</span>
          <h2 className="text-heading mb-6">Choose your depth</h2>
          <p className="text-body text-[var(--text-medium)] max-w-[520px] mx-auto">
            Cohort-based learning with fixed timelines, peer accountability, and structured progression.
          </p>
        </motion.div>

        {/* Subtitle */}
        <p className="text-center text-small text-[var(--text-light)] mb-12">
          Higher tiers = deeper engagement at each stage
        </p>

        {/* Pricing Grid */}
        <div className="pricing-grid">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              className={`pricing-card ${tier.featured ? 'featured' : ''}`}
            >
              {/* Tag area - fixed height for alignment */}
              <div className="h-8 mb-4">
                {tier.featured && <span className="tag">Most Popular</span>}
              </div>

              <h3 className="text-subhead text-[var(--text-dark)] mb-2">{tier.name}</h3>
              {tier.price && (
                <p className="text-2xl font-semibold text-[var(--gold)] mb-2">{tier.price}</p>
              )}
              <p className="text-small text-[var(--text-medium)] mb-6">{tier.description}</p>

              <div className="space-y-3 mb-6 flex-grow">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex flex-col">
                    <span className="text-[12px] text-[var(--text-light)] uppercase tracking-wide">{feature.quadrant}</span>
                    <span className="text-small text-[var(--text-dark)] font-medium">{feature.value}</span>
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${tier.featured ? 'btn-primary' : 'btn-secondary'} w-full justify-center mt-auto`}
              >
                Contact Us
              </a>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-small text-[var(--text-light)] mt-12">
          Bundle and early bird options available.
        </p>
      </div>
    </section>
  );
}
