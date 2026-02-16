"use client";

import { Briefcase, Rocket, Users, TrendingUp } from "lucide-react";

const audiences = [
  {
    icon: Briefcase,
    title: "Career-Focused Professionals",
    description: "Seeking AI-native skills that compound over time",
  },
  {
    icon: Rocket,
    title: "Founders and Operators",
    description: "Who treat productivity as competitive advantage",
  },
  {
    icon: Users,
    title: "Team Leads",
    description: "Building automation-first cultures",
  },
  {
    icon: TrendingUp,
    title: "Consultants",
    description: "Adding process optimization to their practice",
  },
];

export function AudienceSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      {/* Neural grid overlay */}
      <div className="absolute inset-0 neural-grid opacity-30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Who This Is For
            </h2>
          </div>

          {/* Audience cards */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {audiences.map((audience) => {
              const Icon = audience.icon;
              return (
                <div
                  key={audience.title}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  {/* Icon */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-xl font-semibold">{audience.title}</h3>
                  <p className="mt-2 text-muted-foreground">{audience.description}</p>

                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>

          {/* Bottom statement */}
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Like an MBA provides frameworks for business thinking, this curriculum provides
              frameworks for{" "}
              <span className="font-medium text-foreground">AI-native operations thinking</span>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
