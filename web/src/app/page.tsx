'use client';

import { useRef } from 'react';
import { Header } from '@/components/sections/Header';
import { ShiftSection } from '@/components/sections/ShiftSection';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { MethodSection } from '@/components/sections/MethodSection';
import { AudienceSection } from '@/components/sections/AudienceSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { InstructorSection } from '@/components/sections/InstructorSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { CTASection } from '@/components/sections/CTASection';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Fixed Header */}
      <Header containerRef={containerRef} />

      {/* Main content — 11 scroll-snap sections + CTA/footer */}
      <main ref={containerRef} className="bg-[var(--cream)]">
        <ShiftSection />
        <BenefitsSection />
        <MethodSection />
        <AudienceSection />
        <StatsSection />
        <CoursesSection />
        <PricingSection />
        <InstructorSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
    </>
  );
}
