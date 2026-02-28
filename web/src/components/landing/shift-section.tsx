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
