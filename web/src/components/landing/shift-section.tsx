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
              AI-native tools are no longer optional. They&apos;re the new professional baseline.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              But there&apos;s a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches{" "}
              <span className="font-medium text-foreground">AI-native operations thinking</span> — the instinct to identify,
              design, and manage automated processes.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Surface-level tool familiarity isn&apos;t enough. The professionals who master AI-native
              automation management become{" "}
              <span className="font-medium text-foreground">force multipliers</span> — personally and organizationally.
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
