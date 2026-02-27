"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const tiers = [
  {
    name: "Essential",
    description: "Self-paced foundation",
    features: [
      { quadrant: "Core Theory", level: "Self-paced" },
      { quadrant: "Pattern Recognition", level: "Library" },
      { quadrant: "Independent Application", level: "Self-directed" },
      { quadrant: "Expert Guidance", level: "Community" },
    ],
    cta: "Start Learning",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "Structured progression",
    features: [
      { quadrant: "Core Theory", level: "Enhanced" },
      { quadrant: "Pattern Recognition", level: "Library + Live sessions" },
      { quadrant: "Independent Application", level: "Self-directed + Structured" },
      { quadrant: "Expert Guidance", level: "Community + Instructor-led" },
    ],
    cta: "Join Pro",
    highlighted: true,
  },
  {
    name: "Premium",
    description: "Deep engagement",
    features: [
      { quadrant: "Core Theory", level: "Deep" },
      { quadrant: "Pattern Recognition", level: "Library + Live sessions + Expert commentary" },
      { quadrant: "Independent Application", level: "Self-directed + Structured + Personalized" },
      { quadrant: "Expert Guidance", level: "Community + Instructor-led + 1:1 mentorship" },
    ],
    cta: "Go Premium",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Cohort-based learning. Fixed timelines, peer accountability, structured progression.
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              Three tiers — progressive quadrant depth
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative overflow-hidden rounded-2xl border bg-card transition-all ${
                  tier.highlighted
                    ? "border-primary shadow-xl shadow-primary/10 lg:scale-105"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <div className="mb-6 text-center">
                    <h3 className="font-display text-2xl font-semibold">{tier.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  </div>

                  <ul className="mb-8 space-y-4">
                    {tier.features.map((feature) => (
                      <li key={feature.quadrant} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{feature.quadrant}</div>
                          <div className="text-muted-foreground">{feature.level}</div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    asChild
                  >
                    <Link href="https://app.zuzu.codes/auth/sign-up">{tier.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">Higher tiers = deeper engagement at each stage.</p>
            <p className="mt-2 text-sm text-muted-foreground">Bundle and early bird options available.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
