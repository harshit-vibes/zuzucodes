'use client';

import { motion } from 'motion/react';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface PricingTier {
  name: string;
  description: string;
  featured?: boolean;
  features: {
    quadrant: string;
    value: string;
  }[];
  cta: string;
}

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

const tiers: PricingTier[] = [
  {
    name: 'Essential',
    description: 'Self-paced learning with community support',
    features: [
      { quadrant: 'Core Theory', value: 'Self-paced' },
      { quadrant: 'Pattern Recognition', value: 'Library access' },
      { quadrant: 'Independent Application', value: 'Self-directed' },
      { quadrant: 'Expert Guidance', value: 'Community' },
    ],
    cta: 'Contact Us',
  },
  {
    name: 'Pro',
    description: 'Enhanced learning with live instruction',
    featured: true,
    features: [
      { quadrant: 'Core Theory', value: 'Enhanced materials' },
      { quadrant: 'Pattern Recognition', value: '+ Live sessions' },
      { quadrant: 'Independent Application', value: '+ Structured exercises' },
      { quadrant: 'Expert Guidance', value: '+ Instructor-led' },
    ],
    cta: 'Contact Us',
  },
  {
    name: 'Premium',
    description: 'Deep, personalized learning experience',
    features: [
      { quadrant: 'Core Theory', value: 'Deep dive content' },
      { quadrant: 'Pattern Recognition', value: '+ Expert commentary' },
      { quadrant: 'Independent Application', value: '+ Personalized path' },
      { quadrant: 'Expert Guidance', value: '+ 1:1 mentorship' },
    ],
    cta: 'Contact Us',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="section bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1000px]">
        {/* Section header - using standardized component */}
        <SectionHeader
          tag="Pricing"
          headline="Choose your depth"
          description="Cohort-based learning with fixed timelines, peer accountability, and structured progression."
          align="center"
        />

        {/* Subtitle - pulls up into header space */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center body-sm text-[var(--text-muted)] -mt-[var(--content-gap)] mb-[var(--content-gap)]"
        >
          Higher tiers = deeper engagement at each stage
        </motion.p>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.6,
                delay: 0.2 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`pricing-card ${tier.featured ? 'featured' : ''}`}
            >
              {/* Featured badge */}
              {tier.featured && (
                <span className="tag mb-5 inline-block">Most Popular</span>
              )}

              {/* Tier name */}
              <h3 className="display-md text-[var(--text-primary)] mb-3">
                {tier.name}
              </h3>

              {/* Description */}
              <p className="body-md text-[var(--text-secondary)] mb-8">
                {tier.description}
              </p>

              {/* Features - consistent spacing */}
              <div className="space-y-4 mb-8 flex-grow">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex justify-between items-start gap-4">
                    <span className="body-sm text-[var(--text-muted)] flex-shrink-0">
                      {feature.quadrant}
                    </span>
                    <span className="body-sm text-[var(--text-primary)] text-right font-medium">
                      {feature.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${tier.featured ? 'btn-primary' : 'btn-secondary'} w-full mt-auto`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center body-sm text-[var(--text-muted)] mt-[var(--content-gap)]"
        >
          Bundle and early bird options available.
        </motion.p>
      </div>
    </section>
  );
}
