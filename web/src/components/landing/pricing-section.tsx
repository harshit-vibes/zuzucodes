"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const trialFeatures = [
  "Full access to the Coding Foundations track",
  "All 12 lessons and interactive exercises",
  "4-quadrant learning method",
  "Progress tracking",
];

const fullAccessFeatures = [
  "Everything in the trial",
  "Continue building past day 7",
  "Access to all future tracks when released",
  "Cancel anytime — no questions asked",
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Start free. Commit only when it clicks.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Trial */}
            <div className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30">
              <div className="mb-6">
                <h3 className="font-display text-2xl font-semibold">7-Day Trial</h3>
                <p className="mt-2 text-sm text-muted-foreground">Full access. No restrictions.</p>
                <div className="mt-4">
                  <span className="font-display text-4xl font-semibold">$XX</span>
                  <span className="ml-1 text-sm text-muted-foreground">for 7 days</span>
                </div>
              </div>

              <ul className="mb-8 space-y-3">
                {trialFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" variant="outline" size="lg" asChild>
                <Link href="https://app.zuzu.codes/auth/sign-up">Start Trial</Link>
              </Button>
            </div>

            {/* Full Access — highlighted */}
            <div className="relative rounded-2xl border border-primary bg-card p-8 shadow-xl shadow-primary/10 sm:scale-[1.02]">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Best value
                </span>
              </div>

              <div className="mb-6">
                <h3 className="font-display text-2xl font-semibold">Full Access</h3>
                <p className="mt-2 text-sm text-muted-foreground">Continue after your trial.</p>
                <div className="mt-4">
                  <span className="font-display text-4xl font-semibold">$XX</span>
                  <span className="ml-1 text-sm text-muted-foreground">/ month</span>
                </div>
              </div>

              <ul className="mb-8 space-y-3">
                {fullAccessFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full btn-shimmer" size="lg" asChild>
                <Link href="https://app.zuzu.codes/auth/sign-up">Start 7-Day Trial</Link>
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Trial converts to full access automatically. Cancel any time before day 7 and you
            won&apos;t be charged anything.
          </p>
        </div>
      </div>
    </section>
  );
}
