"use client";

export function MethodSection() {
  return (
    <section id="method" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-muted/30" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              The Zuzu Method
            </h2>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              We don&apos;t teach tools. We build instincts.
            </p>
          </div>

          <div className="mb-12 text-center">
            <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl">
              Every topic traverses four quadrants — a complete learning cycle that produces deep,
              transferable understanding. Not just the ability to follow instructions. The ability to think in code.
            </p>
          </div>

          {/* 4-quadrant diagram */}
          <div className="mx-auto mb-12 max-w-3xl">
            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-r border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Independent</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theoretical</span>
                </div>
                <h3 className="font-display text-xl font-semibold">Core Theory</h3>
                <p className="mt-2 text-sm text-muted-foreground">Principles and mental models that transfer</p>
              </div>

              <div className="border-b border-border bg-gradient-to-bl from-accent/5 to-transparent p-8">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guided</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theoretical</span>
                </div>
                <h3 className="font-display text-xl font-semibold">Pattern Recognition</h3>
                <p className="mt-2 text-sm text-muted-foreground">Real-world cases with expert analysis</p>
              </div>

              <div className="border-r border-border bg-gradient-to-tr from-primary/5 to-transparent p-8">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Independent</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</span>
                </div>
                <h3 className="font-display text-xl font-semibold">Independent Application</h3>
                <p className="mt-2 text-sm text-muted-foreground">Build it yourself, make mistakes, learn</p>
              </div>

              <div className="bg-gradient-to-tl from-accent/5 to-transparent p-8">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guided</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</span>
                </div>
                <h3 className="font-display text-xl font-semibold">Expert Guidance</h3>
                <p className="mt-2 text-sm text-muted-foreground">Feedback and refinement from practitioners</p>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-border bg-card/50 p-8 backdrop-blur-sm">
            <h3 className="font-display text-xl font-semibold">Why this works</h3>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Theory without application</span> fades.{" "}
                <span className="font-medium text-foreground">Application without theory</span> is imitation.
              </p>
              <p>
                <span className="font-medium text-foreground">Independence without guidance</span> plateaus.{" "}
                <span className="font-medium text-foreground">Guidance without independence</span> creates dependency.
              </p>
            </div>
            <p className="text-lg font-medium text-foreground">
              Complete the quadrant. Think in code.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
