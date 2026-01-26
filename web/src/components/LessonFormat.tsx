'use client';

import FadeContent from '@/components/FadeContent';
import GlareHover from '@/components/GlareHover';

export function LessonFormat() {
  const steps = [
    {
      number: '01',
      title: 'Theory',
      description: 'Understand the concepts and principles behind each topic with clear explanations.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Demonstration',
      description: 'Watch step-by-step implementations showing exactly how concepts work in practice.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Practice',
      description: 'Apply your knowledge with hands-on exercises designed to reinforce learning.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-32 px-6 bg-[var(--bg-secondary)]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-secondary)] to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        {/* Section header */}
        <FadeContent duration={800}>
          <div className="mb-20 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="line-accent" />
              <span className="text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">Methodology</span>
              <div className="line-accent" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-[var(--text-primary)] mb-4">
              How You&apos;ll Learn
            </h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Every lesson follows a proven three-step framework designed for deep understanding and practical mastery.
            </p>
          </div>
        </FadeContent>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <FadeContent key={step.title} duration={800} delay={index * 150}>
              <GlareHover
                width="100%"
                height="auto"
                background="var(--bg-card)"
                borderRadius="16px"
                borderColor="var(--border-subtle)"
                glareColor="#d4a574"
                glareOpacity={0.12}
                glareSize={300}
                transitionDuration={800}
                className="!h-full"
                style={{ minHeight: '280px' }}
              >
                <div className="relative z-10 p-8 text-left w-full h-full">
                  {/* Number */}
                  <span className="text-xs font-mono text-[var(--accent-primary)] mb-6 block">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] mb-6">
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-serif text-[var(--text-primary)] mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </GlareHover>
            </FadeContent>
          ))}
        </div>

        {/* Bottom connector line (desktop) */}
        <div className="hidden md:block mt-12">
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
            <span className="text-xs font-mono text-[var(--text-muted)]">Repeat &amp; Master</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
