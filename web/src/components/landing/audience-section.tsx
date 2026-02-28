"use client";

import { GraduationCap, Briefcase, ArrowLeftRight, Code2 } from "lucide-react";

const audiences = [
  {
    icon: GraduationCap,
    title: "The Student",
    description:
      "You're watching the world change and you want to be ready for it — not playing catch-up when you graduate. Every line of code you write now is compound interest on your career.",
  },
  {
    icon: Briefcase,
    title: "The Career Starter",
    description:
      "You just started your first job and you can already see AI changing what gets valued. You'd rather be the person who builds the tools than the one who waits to be handed them.",
  },
  {
    icon: ArrowLeftRight,
    title: "The Career Switcher",
    description:
      "You're moving toward tech — or bringing technical depth to the profession you already love. You don't need a degree. You need a structured starting point.",
  },
  {
    icon: Code2,
    title: "The Curious Builder",
    description:
      "You've seen what people build with AI and you want to understand how it works. Not just use it. Actually understand it — and build something of your own.",
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
              Whether you&apos;ve never written a line of code or you&apos;ve tinkered and gotten stuck, the Zuzu Method gives you the
              structured path to go from{" "}
              <strong>curious</strong> to <strong>capable</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
