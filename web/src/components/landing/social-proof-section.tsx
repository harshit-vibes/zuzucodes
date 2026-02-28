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
