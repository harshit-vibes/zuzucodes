# Web Landing Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign zuzu.codes landing page to target young learners learning Python, with correct positioning, new sections (Social Proof, FAQ, Footer CTA), rebuilt pricing, and dead code cleanup.

**Architecture:** Reorder + Add (Approach B). All work in `web/src/components/landing/` and `web/src/app/page.tsx`. No new dependencies required. Three new files added, five existing files rewritten, two lightly updated. Dead code removed.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, TypeScript, Lucide React, shadcn/ui Button. Existing animation utility classes in `globals.css`.

**Design Doc:** `docs/plans/2026-02-28-web-landing-redesign.md`

---

## Task 1: Dead Code Cleanup

**Files:**
- Delete: `web/src/components/sections/` (entire directory)
- Delete: `web/src/components/Hero.tsx`
- Delete: `web/src/components/Outcomes.tsx`
- Delete: `web/src/components/Curriculum.tsx`
- Delete: `web/src/components/LessonFormat.tsx`
- Delete: `web/src/components/Footer.tsx`
- Delete: `web/src/components/BlurText.tsx`
- Delete: `web/src/components/FadeContent.tsx`
- Delete: `web/src/components/GlareHover.tsx`
- Delete: `web/src/components/SpotlightCard.tsx`
- Delete: `web/src/components/index.ts`
- Modify: `web/package.json`

**Step 1: Delete unused component tree**

```bash
cd web
rm -rf src/components/sections
rm src/components/Hero.tsx src/components/Outcomes.tsx src/components/Curriculum.tsx
rm src/components/LessonFormat.tsx src/components/Footer.tsx src/components/BlurText.tsx
rm src/components/FadeContent.tsx src/components/GlareHover.tsx src/components/SpotlightCard.tsx
rm src/components/index.ts
```

**Step 2: Remove unused packages from `web/package.json`**

Remove `gsap`, `@gsap/react`, `motion`, `ogl`, `react-markdown` from the `dependencies` block. The file should become:

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.575.0",
    "next": "16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "shadcn": "^3.7.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**Step 3: Run npm install to sync lockfile**

```bash
cd web
npm install
```

**Step 4: Verify build passes**

```bash
cd web
npm run build
```

Expected: build succeeds. Nothing in `page.tsx` or active components imported from deleted files.

**Step 5: Commit**

```bash
cd web
git add -A
git commit -m "chore: remove dead components and unused dependencies (gsap, motion, ogl)"
```

---

## Task 2: Rebuild `hero-section.tsx`

**Files:**
- Modify: `web/src/components/landing/hero-section.tsx`

New positioning: aspirational Python learning for young learners. Right side replaces the placeholder course card with a 3-milestone learning path visualization.

**Step 1: Replace the entire file**

```tsx
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
    title: "Hello, World",
    description: "Write your first line of Python",
    active: false,
  },
  {
    icon: CheckCircle2,
    step: "Step 2",
    title: "Build functions",
    description: "Solve real problems with code",
    active: true,
  },
  {
    icon: Zap,
    step: "Step 3",
    title: "Automate tasks",
    description: "Replace hours of manual work",
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
                Young Learners Track — now open
              </span>
            </div>

            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              <span className="text-reveal inline-block">Python for the</span>{" "}
              <span className="relative inline-block text-reveal text-reveal-delay-1">
                <span className="relative z-10 text-gradient">next generation</span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-primary/20 to-accent/20 -skew-x-3 rounded-sm" />
              </span>
              <br />
              <span className="text-reveal text-reveal-delay-2 inline-block">of builders.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl fade-in-up stagger-2">
              Structured, hands-on Python learning for students and early-career learners.
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
                    <p className="text-xs font-medium">AI-ready</p>
                    <p className="text-xs text-muted-foreground">Skills</p>
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
```

**Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: passes with no TypeScript errors.

**Step 3: Commit**

```bash
git add web/src/components/landing/hero-section.tsx
git commit -m "feat: rebuild hero section with Python/young learner positioning"
```

---

## Task 3: Update `shift-section.tsx` Copy

**Files:**
- Modify: `web/src/components/landing/shift-section.tsx`

Reframe from "AI-native operations gap" to "Python fundamentals matter more in the AI era, not less."

**Step 1: Replace the body content of the component**

Replace the entire file with:

```tsx
"use client";

export function ShiftSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              The Shift
            </h2>
          </div>

          <div className="space-y-8">
            <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl">
              AI is changing what it means to be skilled. The tools are getting smarter — but the
              people who understand how they work will always run them.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              There&apos;s a gap. YouTube teaches you <span className="font-medium text-foreground">about</span> coding.
              Bootcamps compress six months into six weeks. Neither builds the patient, foundational
              instincts that actually transfer — the ability to look at a problem and{" "}
              <span className="font-medium text-foreground">know how to solve it in code</span>.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Python is the language of this era. And the people who learn it properly — with the
              right structure, the right practice, and the right guidance — become{" "}
              <span className="font-medium text-foreground">force multipliers</span> in every room
              they walk into.
            </p>
          </div>

          <div className="mt-16 flex items-center justify-center">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/shift-section.tsx
git commit -m "feat: rewrite shift section for Python/AI era positioning"
```

---

## Task 4: Rebuild `audience-section.tsx`

**Files:**
- Modify: `web/src/components/landing/audience-section.tsx`

Replace the 4 professional personas (Career Professionals, Founders, Team Leads, Consultants) with 4 young learner personas (Student, Career Starter, Career Switcher, Curious Builder).

**Step 1: Replace entire file**

```tsx
"use client";

import { GraduationCap, Briefcase, ArrowLeftRight, Code2 } from "lucide-react";

const audiences = [
  {
    icon: GraduationCap,
    title: "The Student",
    description:
      "Building foundational skills before entering the workforce. Every line of code you write now is compound interest on your career.",
  },
  {
    icon: Briefcase,
    title: "The Career Starter",
    description:
      "Just started your first job and watching AI change everything around you. Time to stay two steps ahead.",
  },
  {
    icon: ArrowLeftRight,
    title: "The Career Switcher",
    description:
      "Transitioning into tech, or adding technical depth to the profession you already love. Python is your on-ramp.",
  },
  {
    icon: Code2,
    title: "The Curious Builder",
    description:
      "You just want to understand how this stuff works — and to actually build something for once.",
  },
];

export function AudienceSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Who This Is For
            </h2>
          </div>

          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <div
                  key={audience.title}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{audience.title}</h3>
                  <p className="mt-2 text-muted-foreground">{audience.description}</p>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Whether you&apos;re a complete beginner or have tinkered before, the Zuzu Method gives you the
              structured path to go from{" "}
              <span className="font-medium text-foreground">curious to capable</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/audience-section.tsx
git commit -m "feat: rebuild audience section with young learner personas"
```

---

## Task 5: Rebuild `courses-section.tsx`

**Files:**
- Modify: `web/src/components/landing/courses-section.tsx`

Rename to "The Python Learning Track". Update all module content to Python fundamentals. Add a "More Tracks Coming" teaser card at the bottom.

**Step 1: Replace entire file**

```tsx
"use client";

import { Check, Lock } from "lucide-react";

const pythonFoundations = {
  title: "Python Foundations",
  subtitle:
    "From zero to confidently writing Python that solves real problems.",
  modules: [
    {
      title: "Module 1: Getting Started",
      subtitle: "The building blocks of Python",
      lessons: [
        "Your First Python Program",
        "Variables and Data Types",
        "Taking Input, Giving Output",
        "Your First Bug (and How to Fix It)",
      ],
    },
    {
      title: "Module 2: Making Things Happen",
      subtitle: "Control flow, functions, and logic",
      lessons: [
        "If This, Then That",
        "Loops That Do Work For You",
        "Writing Your Own Functions",
        "Scope and How Python Thinks",
      ],
    },
    {
      title: "Module 3: Working with Data",
      subtitle: "The things you'll use every day",
      lessons: [
        "Lists, Tuples, and Dictionaries",
        "Reading and Writing Files",
        "Handling Errors Gracefully",
        "Putting It All Together",
      ],
    },
  ],
  outcomes: [
    "Write Python programs from scratch with confidence",
    "Mental models for breaking any problem into code",
    "The foundation to learn any framework or library next",
  ],
};

const comingTracks = [
  "Python for Law",
  "Python for Medicine",
  "Python for Finance",
  "Python for Marketing",
];

export function CoursesSection() {
  return (
    <section id="courses" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              The Python Learning Track
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              One focused track. Twelve lessons. Real Python, from the very first line.
            </p>
          </div>

          {/* Python Foundations Course */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="border-b border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
              <div className="mb-2 text-sm font-medium text-primary">Track 1</div>
              <h3 className="font-display text-2xl font-semibold sm:text-3xl">
                {pythonFoundations.title}
              </h3>
              <p className="mt-3 text-lg italic text-muted-foreground">
                {pythonFoundations.subtitle}
              </p>
            </div>

            <div className="divide-y divide-border">
              {pythonFoundations.modules.map((module) => (
                <div key={module.title} className="p-8">
                  <div className="mb-4">
                    <h4 className="font-display text-lg font-semibold">{module.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{module.subtitle}</p>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {module.lessons.map((lesson) => (
                      <li key={lesson} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 text-primary">•</span>
                        <span>{lesson}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-border bg-muted/30 p-8">
              <h4 className="mb-4 font-display text-lg font-semibold">You&apos;ll develop:</h4>
              <ul className="space-y-2">
                {pythonFoundations.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-muted-foreground">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* More Tracks Coming */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-dashed border-border bg-card/50 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">More tracks arriving soon</h3>
                <p className="mt-2 text-muted-foreground">
                  Applied Python for every profession — bringing real coding skills to the domains that need them most.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {comingTracks.map((track) => (
                    <span
                      key={track}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground"
                    >
                      {track}
                    </span>
                  ))}
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
                    + more
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/courses-section.tsx
git commit -m "feat: rebuild courses section as Python Learning Track with future tracks tease"
```

---

## Task 6: Create `social-proof-section.tsx`

**Files:**
- Create: `web/src/components/landing/social-proof-section.tsx`

**Note:** Testimonial quotes are placeholders. Replace with real student quotes before launch.

**Step 1: Create the file**

```tsx
"use client";

const stats = [
  { value: "100%", label: "Hands-on exercises", sublabel: "No passive watching" },
  { value: "12", label: "Lessons in track one", sublabel: "More added regularly" },
  { value: "4", label: "Quadrants per topic", sublabel: "Complete learning cycle" },
];

// TODO: Replace with real student testimonials before launch
const testimonials = [
  {
    quote:
      "I tried Codecademy and freeCodeCamp before. zuzu.codes is the first place where I actually feel like I understand what I'm doing, not just passing tests.",
    name: "Priya M.",
    role: "First-year CS student",
  },
  {
    quote:
      "I'm not in tech at all — I work in marketing. But three weeks in, I wrote a script that saved me two hours a week. That felt incredible.",
    name: "Rohan K.",
    role: "Marketing analyst",
  },
  {
    quote:
      "The 4-quadrant method is unlike anything else I've seen. It forced me to actually think, not just copy examples.",
    name: "Aanya S.",
    role: "Undergraduate, 21",
  },
];

export function SocialProofSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          {/* Stats */}
          <div className="mb-16 grid gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-5xl font-semibold text-gradient">{stat.value}</p>
                <p className="mt-2 font-medium text-foreground">{stat.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.sublabel}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mb-16 flex items-center justify-center">
            <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Testimonials */}
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/social-proof-section.tsx
git commit -m "feat: add social proof section with stats and testimonials"
```

---

## Task 7: Rebuild `pricing-section.tsx`

**Files:**
- Modify: `web/src/components/landing/pricing-section.tsx`

Replace 3-tier complexity with a clean 2-state trial → full access design. Prices are TBD placeholders marked with `$XX`.

**Step 1: Replace entire file**

```tsx
"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const trialFeatures = [
  "Full access to Python Foundations track",
  "All 12 lessons and interactive exercises",
  "4-quadrant learning method",
  "Progress tracking",
];

const fullAccessFeatures = [
  "Everything in the trial",
  "Continue past day 7 without interruption",
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
              Try it first. Commit only if it works for you.
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
            won&apos;t be charged again.
          </p>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/pricing-section.tsx
git commit -m "feat: rebuild pricing section as clean trial/full-access 2-card design"
```

---

## Task 8: Create `faq-section.tsx`

**Files:**
- Create: `web/src/components/landing/faq-section.tsx`

Simple client-side accordion using `useState`. No new Radix dependency needed.

**Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Do I need any prior coding experience?",
    answer:
      "No. The Python Foundations track assumes you've never written a line of code. We start from the very beginning and move at a pace that makes sense.",
  },
  {
    question: "How long does the course take?",
    answer:
      "Go at your own pace. Most learners complete the first track in 4–6 weeks spending about an hour a day. There are no deadlines or cohort schedules.",
  },
  {
    question: "What happens after the 7-day trial ends?",
    answer:
      "You'll be charged the monthly subscription fee automatically. If you cancel before day 7, you won't be charged anything. No questions, no hassle.",
  },
  {
    question: "Is this for me if I'm not planning a career in tech?",
    answer:
      "Absolutely. Knowing Python makes you better at almost any job — it's like knowing Excel was 20 years ago, but more powerful. Doctors, lawyers, analysts, and marketers all benefit from being able to write code.",
  },
  {
    question: "How is this different from freeCodeCamp or Codecademy?",
    answer:
      "Those platforms give you exercises. zuzu.codes gives you a learning system. The Zuzu Method's 4-quadrant approach ensures you build genuine understanding — not just the ability to pass tests and forget what you learned.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel directly from your account settings, no email required. If you cancel mid-month, you keep access until the end of your billing period.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Common Questions
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8">
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/faq-section.tsx
git commit -m "feat: add FAQ section with simple accordion"
```

---

## Task 9: Create `footer-cta-section.tsx`

**Files:**
- Create: `web/src/components/landing/footer-cta-section.tsx`

Full-width conversion section just before the footer. Big headline, single CTA.

**Step 1: Create the file**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FooterCtaSection() {
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
          Join the students already learning Python the right way. Try it free for 7 days.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="gradient-border-animated rounded-xl">
            <Button
              size="lg"
              className="group h-14 px-8 text-base btn-shimmer rounded-[calc(var(--radius-xl))]"
              asChild
            >
              <Link href="https://app.zuzu.codes/auth/sign-up">
                Start 7-Day Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">No credit card needed to browse. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/footer-cta-section.tsx
git commit -m "feat: add footer CTA section"
```

---

## Task 10: Update `footer.tsx`

**Files:**
- Modify: `web/src/components/landing/footer.tsx`

Changes: (1) Use `WHATSAPP_URL` from constants instead of hardcoded URL, (2) update tagline, (3) update Product nav links to match new track names.

**Step 1: Replace entire file**

```tsx
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { WHATSAPP_URL } from "@/lib/constants";

const footerLinks = {
  product: [
    { label: "Python Foundations", href: "#courses", external: false },
    { label: "The Method", href: "#method", external: false },
    { label: "Pricing", href: "#pricing", external: false },
  ],
  company: [
    { label: "About", href: "#", external: false },
    { label: "FAQ", href: "#faq", external: false },
    { label: "Contact", href: WHATSAPP_URL, external: true },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy", external: false },
    { label: "Terms of Service", href: "/service", external: false },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <BrandLogo width={28} height={28} />
              </div>
              <span className="font-display text-lg font-semibold">zuzu.codes</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Structured Python learning for the next generation of builders.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Questions? WhatsApp: +91 80118 58376
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Company</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-foreground/80 transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} zuzu.codes. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="WhatsApp"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/landing/footer.tsx
git commit -m "feat: update footer tagline, nav links, and use WHATSAPP_URL constant"
```

---

## Task 11: Update `layout.tsx` Metadata

**Files:**
- Modify: `web/src/app/layout.tsx`

Update `siteDescription`, `title.default`, keywords, and OG/Twitter metadata to match new positioning.

**Step 1: Update the metadata constants** (lines 24–78)

Change:
```ts
const siteDescription = "AI-native upskilling for the modern professional. Learn to identify, design, and manage automated processes with MBA-level rigor.";
```

To:
```ts
const siteDescription = "Structured Python learning for students and early-career learners. Build real skills. Build real things.";
```

Change the title default:
```ts
title: {
  default: "zuzu.codes — Learn Python for the AI Era",
  template: "%s | zuzu.codes",
},
```

Change keywords:
```ts
keywords: [
  "learn Python",
  "Python for beginners",
  "Python course",
  "coding for students",
  "learn to code",
  "programming fundamentals",
  "AI era coding",
  "hands-on Python",
  "Python learning track",
],
```

Change OG/Twitter titles to `"zuzu.codes — Learn Python for the AI Era"` and descriptions to match the new `siteDescription`.

**Step 2: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "feat: update SEO metadata for new Python learning positioning"
```

---

## Task 12: Update `page.tsx` — New Section Composition

**Files:**
- Modify: `web/src/app/page.tsx`

Wire up all new sections in the correct order.

**Step 1: Replace entire file**

```tsx
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShiftSection } from "@/components/landing/shift-section";
import { MethodSection } from "@/components/landing/method-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FooterCtaSection } from "@/components/landing/footer-cta-section";
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
        <SocialProofSection />
        <PricingSection />
        <FaqSection />
        <FooterCtaSection />
      </main>
      <Footer />
    </>
  );
}
```

**Step 2: Run full build + lint**

```bash
cd web
npm run lint
npm run build
```

Expected: zero errors, zero warnings. All 11 sections imported and rendering.

**Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "feat: wire up all new landing sections in final order"
```

---

## Task 13: Final Verification

**Step 1: Run dev server and visually verify all sections**

```bash
cd web
npm run dev
```

Open `http://localhost:3000`. Scroll through and verify:
- [ ] Header — shows logo, nav, "Start 7-Day Trial" CTA
- [ ] Hero — new headline "Python for the next generation of builders", 3 milestone cards, no 0% progress bar
- [ ] Shift — updated copy about Python fundamentals in the AI era
- [ ] Method — unchanged 4-quadrant diagram (just verify it still renders)
- [ ] Audience — 4 young learner personas (Student, Career Starter, Career Switcher, Curious Builder)
- [ ] Courses — "Python Learning Track", 3 modules with Python lesson titles, "More Tracks Coming" card
- [ ] Social Proof — 3 stat numbers + 3 testimonial cards
- [ ] Pricing — 2-card layout (Trial / Full Access), $XX placeholders visible
- [ ] FAQ — 6 questions, accordion opens/closes on click
- [ ] Footer CTA — "Ready to start building?" with gradient border button
- [ ] Footer — updated tagline + nav links

**Step 2: Run production build one final time**

```bash
cd web
npm run build
```

Expected: build succeeds with no errors.

**Step 3: Final commit if any fixes were made**

```bash
git add -A
git commit -m "fix: final landing page polish after visual review"
```

---

## Before Launch Checklist

These are not blocking for development but must be done before going live:

- [ ] Replace `$XX` price placeholders in `pricing-section.tsx` with real prices
- [ ] Replace placeholder testimonials in `social-proof-section.tsx` with real student quotes
- [ ] Replace `og-image.png` with a new OG image that matches new positioning
- [ ] Verify `https://app.zuzu.codes/auth/sign-up` CTA destination is correct
- [ ] Test on mobile (320px and 375px widths)
- [ ] Test dark mode toggle
