"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, BookOpen, Clock } from "lucide-react";

// Generate particle positions (8-10 for subtle effect)
const particles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${10 + (i * 9) % 80}%`,
  top: `${15 + (i * 13) % 70}%`,
  delay: `${i * 0.8}s`,
  duration: `${6 + (i % 4)}s`,
}));

export function HeroSection() {
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
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <div className="flex flex-col justify-center">
            {/* Badge with animated ping */}
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                New courses added weekly
              </span>
            </div>

            {/* Headline with text reveal */}
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="text-reveal inline-block">AI-Native Upskilling</span>{" "}
              <span className="relative inline-block text-reveal text-reveal-delay-1">
                <span className="relative z-10 text-gradient">for the Modern Professional</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-primary/20 to-accent/20 -skew-x-3 rounded-sm" />
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl fade-in-up stagger-2">
              Build AI-native operations instincts through our quadrant-based learning method.
              MBA-level rigor applied to automation management and process design.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center fade-in-up stagger-3">
              <Button size="lg" className="group h-12 px-6 text-base btn-shimmer" asChild>
                <Link href="/sign-up">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-6 text-base" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex flex-wrap items-center gap-8 border-t border-border pt-8 fade-in-up stagger-4">
              <div>
                <p className="font-display text-3xl font-semibold">2 Courses</p>
                <p className="text-sm text-muted-foreground">Personal + Business</p>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="font-display text-3xl font-semibold">4 Quadrants</p>
                <p className="text-sm text-muted-foreground">Complete learning cycle</p>
              </div>
              <div className="hidden h-10 w-px bg-border sm:block" />
              <div>
                <p className="font-display text-3xl font-semibold">3 Tiers</p>
                <p className="text-sm text-muted-foreground">Progressive depth</p>
              </div>
            </div>
          </div>

          {/* Right: Course Preview Card */}
          <div className="relative flex items-center justify-center lg:justify-end">
            {/* Decorative background elements */}
            <div className="absolute -right-8 -top-8 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-accent/20 blur-2xl" />

            {/* Main preview card with animated gradient border */}
            <div className="relative w-full max-w-md">
              {/* Gradient border wrapper */}
              <div className="gradient-border-animated p-1 rounded-2xl">
                {/* Card */}
                <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
                  {/* Video thumbnail area with neural grid overlay */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {/* Neural grid overlay */}
                    <div className="absolute inset-0 neural-grid opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />

                    {/* Play button with pulse ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="pulse-ring flex h-16 w-16 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer">
                        <Play className="h-6 w-6 text-primary fill-primary ml-1" />
                      </div>
                    </div>

                    {/* Course badge */}
                    <div className="absolute left-3 top-3">
                      <span className="rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                        Featured Course
                      </span>
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold">
                      Personal Productivity Automation
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      From manual processes to systematized personal operations that run themselves.
                    </p>

                    {/* Meta info */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>3 modules</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>Cohort-based</span>
                      </div>
                    </div>

                    {/* Progress indicator (decorative) */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Learning method</span>
                        <span className="font-medium text-primary">4 Quadrants</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-0 rounded-full bg-gradient-to-r from-primary to-primary/70" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements with glass-premium effect */}
              <div className="absolute -left-4 top-1/4 rounded-lg glass-premium p-3 shadow-lg card-lift">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Hands-on</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/4 rounded-lg glass-premium p-3 shadow-lg card-lift">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary icon-glow">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Production</p>
                    <p className="text-xs text-muted-foreground">Ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
