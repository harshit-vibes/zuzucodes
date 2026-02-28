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
              Something shifted. Tools that used to take years to build now get shipped in a weekend.
              AI is building apps, writing code, designing products — and it&apos;s only getting faster.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              But there&apos;s a gap between watching something get built and knowing how to build it
              yourself. Prompting is not programming. Clicking is not creating. The people who will
              run this era aren&apos;t just using the tools —{" "}
              <span className="font-medium text-foreground">they understand them</span>.
            </p>

            <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Coding is no longer a profession. It&apos;s a baseline. And the people who learn it
              properly — with the right structure, the right practice, the right guidance — become{" "}
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
