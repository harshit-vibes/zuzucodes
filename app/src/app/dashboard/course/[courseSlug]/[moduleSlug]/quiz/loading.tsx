export default function QuizLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Shell header skeleton */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-7 h-7 skeleton rounded shrink-0" />
        <div className="w-px h-5 bg-border/30 shrink-0" />
        <div className="h-2.5 w-24 skeleton rounded shrink-0" />
        <div className="h-3.5 w-40 skeleton rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
        <div className="w-8 h-8 skeleton rounded-full shrink-0" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto px-6 py-10">
          {/* Quiz title + meta — centered */}
          <header className="max-w-2xl mx-auto text-center mb-10 space-y-3">
            <div className="h-7 w-64 skeleton rounded mx-auto" />
            <div className="h-4 w-48 skeleton rounded mx-auto" />
          </header>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 skeleton rounded" />
                <div className="h-3.5 w-16 skeleton rounded" />
              </div>
              <div className="h-1.5 skeleton rounded-full" />
            </div>

            {/* Question card */}
            <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8">
              <div className="space-y-2 mb-8">
                <div className="h-6 w-full skeleton rounded" />
                <div className="h-6 w-3/4 skeleton rounded" />
              </div>
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <div key={letter} className="p-4 rounded-xl border border-border/60">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
                      <div className="flex-1 py-1">
                        <div className="h-5 w-4/5 skeleton rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="h-10 w-28 skeleton rounded-lg" />
              <div className="h-10 w-24 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Shell footer skeleton */}
      <div className="shrink-0 h-12 flex items-center justify-between px-6 border-t border-border/30">
        <div className="h-2.5 w-16 skeleton rounded" />
        <div className="h-2.5 w-16 skeleton rounded" />
      </div>
    </div>
  );
}
