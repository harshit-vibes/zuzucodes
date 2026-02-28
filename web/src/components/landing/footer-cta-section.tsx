"use client";

import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getSignUpUrl, SIGN_IN_URL } from "@/lib/get-sign-up-url";

export function FooterCtaSection() {
  const ph = usePostHog();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 neural-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

      <div className="container relative mx-auto px-6 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Ready to start building?
        </h2>
        <p className="mt-6 mx-auto max-w-xl text-lg text-muted-foreground">
          Join the next generation of builders. Try it free for 3 days.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="gradient-border-animated rounded-xl">
            <Button
              size="lg"
              className="group h-14 px-8 text-base btn-shimmer rounded-[calc(var(--radius-xl))]"
              asChild
            >
              <a
                href={SIGN_IN_URL}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  ph?.capture('cta_clicked', { section: 'footer_cta', text: 'Get Started Free' });
                  window.location.assign(getSignUpUrl());
                }}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Cancel anytime. No long-term commitment.</p>
        </div>
      </div>
    </section>
  );
}
