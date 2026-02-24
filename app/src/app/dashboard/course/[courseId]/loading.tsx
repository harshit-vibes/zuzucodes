export default function CourseLoading() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="h-5 w-16 skeleton rounded" />
          <div className="h-7 w-2/3 skeleton rounded" />
          <div className="h-4 w-full skeleton rounded" />
          <div className="h-4 w-4/5 skeleton rounded" />
        </div>

        {/* Progress card */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-3 w-36 skeleton rounded" />
            </div>
            <div className="h-6 w-10 skeleton rounded" />
          </div>
          <div className="h-1.5 w-full skeleton rounded-full" />
          <div className="h-9 w-full skeleton rounded-lg" />
        </div>

        {/* Curriculum */}
        <div className="space-y-3">
          <div className="h-4 w-20 skeleton rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <div className="h-4 w-48 skeleton rounded" />
                <div className="h-3 w-8 skeleton rounded" />
              </div>
              <div className="divide-y divide-border/20">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-3.5 h-3.5 skeleton rounded-full shrink-0" />
                    <div className="h-4 flex-1 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
