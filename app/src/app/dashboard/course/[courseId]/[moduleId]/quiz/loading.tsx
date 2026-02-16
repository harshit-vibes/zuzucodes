export default function QuizLoading() {
  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-14 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-12 skeleton rounded" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        {/* Quiz header - centered */}
        <header className="max-w-2xl mx-auto text-center mb-10">
          {/* Module badge + passed indicator */}
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-6 w-24 skeleton rounded-md" />
          </div>

          {/* Quiz title */}
          <div className="h-8 md:h-10 w-72 skeleton rounded mx-auto mb-3" />

          {/* Description */}
          <div className="h-5 w-96 max-w-full skeleton rounded mx-auto mb-4" />

          {/* Meta: questions count + passing score */}
          <div className="inline-flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 skeleton rounded" />
              <div className="h-4 w-24 skeleton rounded" />
            </div>
            <div className="w-1 h-1 rounded-full skeleton" />
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 skeleton rounded" />
              <div className="h-4 w-20 skeleton rounded" />
            </div>
          </div>
        </header>

        {/* Quiz player card */}
        <div className="max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-4 w-16 skeleton rounded" />
            </div>
            <div className="h-1.5 skeleton rounded-full" />
          </div>

          {/* Question card */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 md:p-8 mb-6">
            {/* Question text */}
            <div className="space-y-2 mb-8">
              <div className="h-6 w-full skeleton rounded" />
              <div className="h-6 w-3/4 skeleton rounded" />
            </div>

            {/* Answer options - styled cards */}
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((letter) => (
                <div
                  key={letter}
                  className="p-4 rounded-xl border border-border/60 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Letter badge */}
                    <div className="w-8 h-8 skeleton rounded-lg flex-shrink-0" />

                    {/* Option text */}
                    <div className="flex-1 py-1">
                      <div className="h-5 w-4/5 skeleton rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-28 skeleton rounded-lg" />
            <div className="h-10 w-24 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
