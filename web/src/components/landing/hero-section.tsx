"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, CheckCircle2, Zap } from "lucide-react";

const particles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${10 + (i * 9) % 80}%`,
  top: `${15 + (i * 13) % 70}%`,
  delay: `${i * 0.8}s`,
  duration: `${6 + (i % 4)}s`,
}));

const milestones = [
  {
    icon: Code2,
    step: "Step 1",
    title: "Write your first program",
    description: "Understand how code actually works",
    active: false,
  },
  {
    icon: CheckCircle2,
    step: "Step 2",
    title: "Solve real problems",
    description: "Build logic, not just syntax",
    active: true,
  },
  {
    icon: Zap,
    step: "Step 3",
    title: "Ship something real",
    description: "Go from learner to builder",
    active: false,
  },
];

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
              <span className="text-reveal inline-block">The AI era rewards</span>{" "}
              <span className="relative inline-block text-reveal text-reveal-delay-1">
                <span className="relative z-10 text-gradient">people who can build.</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-primary/20 to-accent/20 -skew-x-3 rounded-sm" />
              </span>
              <br />
              <span className="text-reveal text-reveal-delay-2 inline-block">Here&apos;s where you start.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl fade-in-up stagger-2">
              Structured coding for students and early-career learners — starting from zero.
              Build real skills. Build real things.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center fade-in-up stagger-3">
              <Button size="lg" className="group h-12 px-6 text-base btn-shimmer" asChild>
                <Link href="https://app.zuzu.codes/auth/sign-up">
                  Start 7-Day Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-12 px-6 text-base" asChild>
                <a href="#courses">See what&apos;s inside ↓</a>
              </Button>
            </div>

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
                <p className="font-display text-3xl font-semibold">7-Day Trial</p>
                <p className="text-sm text-muted-foreground">Risk-free start</p>
              </div>
            </div>
          </div>

          {/* Right: Learning path visualization */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="absolute -right-8 -top-8 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-accent/20 blur-2xl" />

            <div className="relative w-full max-w-md space-y-4">
              {milestones.map((milestone) => {
                const Icon = milestone.icon;
                return (
                  <div
                    key={milestone.step}
                    className={`rounded-xl border p-5 flex items-center gap-4 transition-all ${
                      milestone.active
                        ? "border-primary/50 bg-card shadow-lg shadow-primary/10"
                        : "border-border bg-card/60 opacity-70"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        milestone.active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{milestone.step}</p>
                      <p className="font-display text-base font-semibold">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{milestone.description}</p>
                    </div>
                    {milestone.active && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          In progress
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 rounded-lg glass-premium p-3 shadow-lg card-lift">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Beginner</p>
                    <p className="text-xs text-muted-foreground">Friendly</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-4 rounded-lg glass-premium p-3 shadow-lg card-lift">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary icon-glow">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Built for the</p>
                    <p className="text-xs text-muted-foreground">AI era</p>
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
