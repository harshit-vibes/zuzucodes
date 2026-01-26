'use client';

import SpotlightCard from '@/components/SpotlightCard';
import FadeContent from '@/components/FadeContent';

interface OutcomesProps {
  outcomes: string[];
}

export function Outcomes({ outcomes }: OutcomesProps) {
  return (
    <section className="relative py-32 px-6 bg-[var(--bg-secondary)]">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[var(--bg-primary)] to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        {/* Section header */}
        <FadeContent duration={800}>
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="line-accent" />
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">What you&apos;ll learn</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-[var(--text-primary)] leading-tight">
              Master the fundamentals<br />
              <span className="text-[var(--text-secondary)]">of AI automation</span>
            </h2>
          </div>
        </FadeContent>

        {/* Outcomes grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {outcomes.map((outcome, index) => (
            <FadeContent key={index} duration={800} delay={index * 100}>
              <SpotlightCard
                className="h-full !bg-[var(--bg-card)] !border-[var(--border-subtle)] !rounded-2xl !p-6 hover:!border-[var(--border-hover)] transition-all duration-300"
                spotlightColor="rgba(212, 165, 116, 0.08)"
              >
                <div className="flex items-start gap-4">
                  {/* Number */}
                  <span className="number-badge flex-shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Text */}
                  <p className="text-[var(--text-primary)] leading-relaxed pt-1">
                    {outcome}
                  </p>
                </div>
              </SpotlightCard>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}
