"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getSignUpUrl, SIGN_IN_URL } from "@/lib/get-sign-up-url";

const particles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${10 + (i * 9) % 80}%`,
  top: `${15 + (i * 13) % 70}%`,
  delay: `${i * 0.8}s`,
  duration: `${6 + (i % 4)}s`,
}));

export function HeroSection() {
  const ph = usePostHog();

  useEffect(() => {
    if (!document.querySelector('script[src*="splinetool"]')) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://unpkg.com/@splinetool/viewer@1.12.61/build/spline-viewer.js";
      document.head.appendChild(script);
    }

    // Inject a <style> into the shadow root to persistently hide the Spline logo.
    // Inline style overrides can be reset by the viewer; a stylesheet cannot.
    const tryHide = (): boolean => {
      const viewer = document.querySelector("spline-viewer");
      const root = viewer?.shadowRoot;
      if (!root) return false;
      if (!root.querySelector("[data-zuzu-hide]")) {
        const s = document.createElement("style");
        s.setAttribute("data-zuzu-hide", "");
        s.textContent = "#logo,a[href*='spline.design']{display:none!important}";
        root.appendChild(s);
      }
      return true;
    };

    if (!tryHide()) {
      const iv = setInterval(() => { if (tryHide()) clearInterval(iv); }, 200);
      const to = setTimeout(() => clearInterval(iv), 15000);
      return () => { clearInterval(iv); clearTimeout(to); };
    }
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden pt-16">
      {/* Neural grid background */}
      <div className="absolute inset-0 neural-grid" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/15 blur-[80px] pointer-events-none" />

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="neural-particle"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background pointer-events-none" />

      <div className="container relative mx-auto flex min-h-[calc(100vh-4rem)] items-center px-6 py-20">
        {/*
          Grid layout:
          - Mobile (1 col): text → spline → cta (DOM order)
          - Desktop (2 col): col-1 row-1=text, col-1 row-2=cta, col-2 rows-1-2=spline
        */}
        <div className="grid w-full grid-cols-1 lg:grid-cols-2 lg:gap-x-16">
          {/* Text block: badge + headline + paragraph */}
          <div className="flex flex-col lg:col-start-1 lg:row-start-1 lg:self-end lg:pb-6">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Now open — Coding for the AI era
              </span>
            </div>

            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="text-reveal inline-block">The AI era</span>{" "}
              <span className="text-reveal text-reveal-delay-1 inline-block">rewards</span>{" "}
              <span className="relative inline-block text-reveal text-reveal-delay-2">
                <span className="relative z-10 text-gradient">builders.</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-primary/20 to-accent/20 -skew-x-3 rounded-sm" />
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl fade-in-up stagger-2">
              Structured coding for students and early-career learners — starting from zero.
              Build real skills. Build real things.
            </p>
          </div>

          {/* Spline 3D scene — between paragraph and CTA on mobile, right column on desktop */}
          <div className="relative mt-8 flex items-center justify-center lg:col-start-2 lg:row-start-1 lg:row-end-3 lg:mt-0">
            <spline-viewer
              url="https://prod.spline.design/nJcOGf2mvI8wkCXH/scene.splinecode"
              className="w-full"
              style={{ minHeight: "280px" }}
            />
          </div>

          {/* CTA + stats */}
          <div className="flex flex-col lg:col-start-1 lg:row-start-2 lg:self-start lg:pt-6">
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center fade-in-up stagger-3 lg:mt-0">
              <Button size="lg" className="group h-12 px-6 text-base btn-shimmer" asChild>
                <a
                  href={SIGN_IN_URL}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    ph?.capture('cta_clicked', { section: 'hero', text: 'Get Started' });
                    window.location.assign(getSignUpUrl());
                  }}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button variant="ghost" size="lg" className="h-12 px-6 text-base" asChild>
                <a href="#courses">See what&apos;s inside ↓</a>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground fade-in-up stagger-4">
              ✓ 3-day free trial included &nbsp;·&nbsp; Cancel before day 3, pay nothing
            </p>

            <div className="mt-16 flex flex-wrap items-center gap-8 border-t border-border pt-8 fade-in-up stagger-4">
              <div>
                <p className="font-display text-3xl font-semibold">12 Lessons</p>
                <p className="text-sm text-muted-foreground">In the first track</p>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="font-display text-3xl font-semibold">4 Quadrants</p>
                <p className="text-sm text-muted-foreground">Complete learning cycle</p>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="font-display text-3xl font-semibold">3-Day Trial</p>
                <p className="text-sm text-muted-foreground">Risk-free start</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
