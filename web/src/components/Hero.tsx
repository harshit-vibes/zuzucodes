'use client';

import { Course } from '@/types/course';
import BlurText from '@/components/BlurText';
import FadeContent from '@/components/FadeContent';

interface HeroProps {
  course: Course;
}

export function Hero({ course }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Subtle ambient gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(212,165,116,0.04)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(167,139,250,0.03)_0%,transparent_70%)] blur-3xl" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Category tag */}
        <FadeContent duration={800} delay={0}>
          <div className="mb-8">
            <span className="tag">
              {course.category}
            </span>
          </div>
        </FadeContent>

        {/* Main title with elegant serif */}
        <FadeContent duration={800} delay={100}>
          <h1 className="mb-6">
            <BlurText
              text={course.title}
              className="text-5xl md:text-7xl font-serif font-normal leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]"
              delay={50}
              animateBy="words"
            />
          </h1>
        </FadeContent>

        {/* Description */}
        <FadeContent duration={800} delay={200}>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            {course.description}
          </p>
        </FadeContent>

        {/* Stats row - refined */}
        <FadeContent duration={800} delay={300}>
          <div className="flex flex-wrap justify-center gap-8 mb-12 text-sm">
            <Stat value={course.duration} label="Duration" />
            <Stat value={course.level} label="Level" />
            <Stat value="12 lessons" label="Content" />
          </div>
        </FadeContent>

        {/* CTA Button */}
        <FadeContent duration={800} delay={400}>
          <button className="btn-premium group">
            <span className="flex items-center gap-3">
              Begin Learning
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </button>
        </FadeContent>

        {/* Prerequisites - subtle */}
        <FadeContent duration={800} delay={500}>
          <p className="mt-10 text-sm text-[var(--text-muted)] font-mono">
            Prerequisites: {course.prerequisites}
          </p>
        </FadeContent>
      </div>

      {/* Scroll indicator */}
      <FadeContent duration={800} delay={600}>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--text-muted)] to-transparent" />
          </div>
        </div>
      </FadeContent>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
      <div className="text-left">
        <div className="text-[var(--text-primary)] font-medium">{value}</div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
