import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShiftSection } from "@/components/landing/shift-section";
import { MethodSection } from "@/components/landing/method-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ShiftSection />
        <MethodSection />
        <AudienceSection />
        <CoursesSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
