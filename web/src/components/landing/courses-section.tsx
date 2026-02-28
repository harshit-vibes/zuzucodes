"use client";

import { Check, Lock } from "lucide-react";

const pythonFoundations = {
  title: "Coding Foundations",
  subtitle:
    "From zero to confidently writing code that solves real problems.",
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
    "Write programs from scratch with confidence",
    "Mental models for breaking any problem into code",
    "The foundation to learn any framework, language, or AI tool next",
  ],
};

const comingTracks = [
  "Coding for Law",
  "Coding for Medicine",
  "Coding for Finance",
  "Coding for Marketing",
];

export function CoursesSection() {
  return (
    <section id="courses" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Your Coding Foundation
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              One focused track. Twelve lessons. Real code, from the very first line.
            </p>
          </div>

          {/* Coding Foundations Course */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="border-b border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
              <div className="mb-2 text-sm font-medium text-primary">Track 1</div>
              <h3 className="font-display text-2xl font-semibold sm:text-3xl">
                {pythonFoundations.title}
              </h3>
              <span className="mt-1 block text-xs text-muted-foreground">Taught in Python</span>
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
                  Applied coding for every profession — bringing real programming skills to the domains that need them most.
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
