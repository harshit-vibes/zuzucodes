export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Greeting Banner skeleton */}
      <div className="relative overflow-hidden border-b border-border/50">
        {/* Background pattern placeholder */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="w-full h-full bg-[repeating-linear-gradient(90deg,currentColor_0px,currentColor_1px,transparent_1px,transparent_32px),repeating-linear-gradient(0deg,currentColor_0px,currentColor_1px,transparent_1px,transparent_32px)]" />
        </div>

        <div className="relative container mx-auto px-6 py-8">
          <div className="max-w-2xl">
            {/* Eyebrow - pulsing dot + label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full skeleton animate-pulse" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>

            {/* Large greeting title */}
            <div className="h-10 md:h-12 w-72 md:w-96 skeleton rounded mb-3" />

            {/* Motivational subtitle */}
            <div className="h-5 w-48 skeleton rounded" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Stats + Heatmap row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Stats cards - horizontal row */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-border/60 bg-card/50">
                <div className="h-3 w-12 skeleton rounded mb-3" />
                <div className="h-8 w-16 skeleton rounded mb-1" />
                <div className="h-3 w-20 skeleton rounded" />
              </div>
            ))}
          </div>

          {/* Activity heatmap placeholder */}
          <div className="lg:w-80 p-4 rounded-xl border border-border/60 bg-card/50">
            <div className="h-4 w-24 skeleton rounded mb-3" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="w-3 h-3 skeleton rounded-sm" />
              ))}
            </div>
          </div>
        </div>

        {/* Continue Learning section */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 skeleton rounded-lg" />
              <div>
                <div className="h-5 w-36 skeleton rounded mb-1" />
                <div className="h-3 w-48 skeleton rounded" />
              </div>
            </div>
            <div className="h-9 w-24 skeleton rounded-lg" />
          </div>
        </div>

        {/* Tracks Section */}
        <div>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 skeleton rounded-full" />
            <div className="h-6 w-32 skeleton rounded" />
          </div>

          {/* Track cards */}
          <div className="space-y-6">
            {[1, 2].map((t) => (
              <div key={t} className="rounded-xl border border-border/60 overflow-hidden">
                {/* Track header */}
                <div className="p-5 bg-muted/30 flex items-center gap-4">
                  <div className="w-10 h-10 skeleton rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 w-40 skeleton rounded mb-2" />
                    <div className="h-3 w-64 skeleton rounded" />
                  </div>
                </div>

                {/* Course cards grid */}
                <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((c) => (
                    <div key={c} className="p-4 rounded-lg border border-border/40 bg-card/30">
                      <div className="h-28 skeleton rounded-lg mb-3" />
                      <div className="h-4 w-3/4 skeleton rounded mb-2" />
                      <div className="h-3 w-full skeleton rounded mb-1" />
                      <div className="h-3 w-2/3 skeleton rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
