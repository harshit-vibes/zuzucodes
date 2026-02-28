"use client";

import { Check, ArrowRight } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { getSignUpUrl } from "@/lib/get-sign-up-url";

const features = [
  "Full access to the Coding Foundations track",
  "All 12 lessons and interactive exercises",
  "4-quadrant learning method — Learn, Practice, Build, Reflect",
  "In-browser code editor with instant feedback",
  "Progress tracking across lessons and modules",
  "Access to all future tracks when released",
  "Cancel anytime — no questions asked",
];

export function PricingSection() {
  const ph = usePostHog();

  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Simple pricing.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              One plan. Full access. First 3 days free.
            </p>
          </div>

          {/* Single plan card */}
          <div className="mx-auto max-w-lg">
            <div className="relative rounded-2xl border border-primary bg-card p-8 shadow-xl shadow-primary/10">
              {/* Trial badge */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                  3-day free trial included
                </span>
              </div>

              <div className="mb-8 text-center">
                <h3 className="font-display text-2xl font-semibold">Full Access</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Everything you need to go from zero to builder.
                </p>
                <div className="mt-6 flex items-baseline justify-center gap-3">
                  <span className="font-display text-2xl text-muted-foreground line-through">$49.99</span>
                  <span className="font-display text-5xl font-semibold">$14.99</span>
                  <span className="text-base text-muted-foreground">/ month</span>
                </div>
                <p className="mt-2 text-sm font-medium text-primary">
                  First 3 days completely free
                </p>
              </div>

              <ul className="mb-8 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full btn-shimmer group" size="lg" asChild>
                <a
                  href={getSignUpUrl()}
                  onClick={() => ph?.capture('cta_clicked', { section: 'pricing', text: 'Get Started Free' })}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Your subscription starts with a 3-day free trial. Cancel before day 3 and you
            won&apos;t be charged anything.
          </p>
        </div>
      </div>
    </section>
  );
}
