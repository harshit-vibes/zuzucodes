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
