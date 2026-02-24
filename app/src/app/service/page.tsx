import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BrandLogo } from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "Terms of Service | zuzu.codes",
  description: "Terms of Service for zuzu.codes - Rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <BrandLogo
                  width={28}
                  height={28}
                  
                />
              </div>
              <span className="font-semibold">zuzu.codes</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 3, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using zuzu.codes (zuzu.codes), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              zuzu.codes is an AI-native upskilling platform that provides courses, tutorials, and
              educational content focused on building modern professional skills. We offer
              both free and premium content to help professionals upskill for the AI era.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To access certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Share your account credentials with others</li>
              <li>Copy, distribute, or redistribute course content without permission</li>
              <li>Use the platform for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the platform</li>
              <li>Use automated systems to access the platform without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on zuzu.codes, including courses, videos, text, graphics, and code
              examples, is owned by zuzu.codes or its licensors and is protected by copyright
              and other intellectual property laws. You may not reproduce, distribute, or create
              derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. User Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you submit any content to our platform (such as forum posts or project submissions),
              you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and
              display such content in connection with our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              The platform and all content are provided &quot;as is&quot; without warranties of any kind.
              We do not guarantee that the platform will be uninterrupted, secure, or error-free.
              Course completion does not guarantee employment or specific outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, zuzu.codes shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violations
              of these terms or for any other reason at our sole discretion. Upon termination, your
              right to use the platform will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms of Service at any time. We will notify users of material
              changes by posting a notice on our platform. Your continued use of the platform after
              changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at:{" "}
              <a href="https://wa.me/918011858376" className="text-primary hover:underline">
                WhatsApp: +91 80118 58376
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
