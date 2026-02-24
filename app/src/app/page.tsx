import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShiftSection } from "@/components/landing/shift-section";
import { MethodSection } from "@/components/landing/method-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <ShiftSection />
        <section id="method">
          <MethodSection />
        </section>
        <AudienceSection />
        <section id="courses">
          <CoursesSection />
        </section>
        <section id="pricing">
          <PricingSection />
        </section>
      </main>
      <Footer />
    </>
  );
}
