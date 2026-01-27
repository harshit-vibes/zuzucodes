'use client';

import { useRef } from 'react';
import { Header } from '@/components/sections/Header';
import { ShiftSection } from '@/components/sections/ShiftSection';
import { MethodSection } from '@/components/sections/MethodSection';
import { AudienceSection } from '@/components/sections/AudienceSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Fixed Header */}
      <Header containerRef={containerRef} />

      {/* Main content */}
      <main ref={containerRef} className="bg-[var(--cream)] pb-[var(--footer-height)]">
        <ShiftSection />
        <MethodSection />
        <AudienceSection />
        <CoursesSection />
        <PricingSection />
      </main>

      {/* Fixed footer */}
      <Footer />
    </>
  );
}
