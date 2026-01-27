'use client';

import { useRef } from 'react';
import { Header } from '@/components/sections/Header';
import { ShiftSection } from '@/components/sections/ShiftSection';
import { MethodSection } from '@/components/sections/MethodSection';
import { AudienceSection } from '@/components/sections/AudienceSection';
import { CoursesSection } from '@/components/sections/CoursesSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { FooterSection } from '@/components/sections/FooterSection';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      {/* Fixed Header with navigation */}
      <Header containerRef={containerRef} />

      {/* Sections - The Story Arc */}
      {/* 1. THE SHIFT (hook) */}
      <ShiftSection />

      {/* 2. THE METHOD (differentiator) */}
      <MethodSection />

      {/* 3. WHO IT'S FOR (audience) */}
      <AudienceSection />

      {/* 4. THE COURSES (offering) */}
      <CoursesSection />

      {/* 5. PRICING (action) */}
      <PricingSection />

      {/* 6. ABOUT (close) */}
      <FooterSection />
    </div>
  );
}
