export default function LessonLoading() {
  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-14 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
        </div>
      </div>

      {/* Article content */}
      <article className="container mx-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Lesson header */}
          <header className="mb-10">
            {/* Progress bar with step counter */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-1 skeleton rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-primary/30 rounded-full" />
              </div>
              <div className="h-4 w-10 skeleton rounded" />
            </div>

            {/* Large lesson title */}
            <div className="h-10 md:h-12 w-5/6 skeleton rounded" />
          </header>

          {/* Prose content skeleton - mimics article structure */}
          <div className="space-y-6">
            {/* Opening paragraph */}
            <div className="space-y-3">
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-11/12 skeleton rounded" />
              <div className="h-5 w-4/5 skeleton rounded" />
            </div>

            {/* Subheading */}
            <div className="h-7 w-48 skeleton rounded mt-8" />

            {/* Paragraph */}
            <div className="space-y-3">
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-3/4 skeleton rounded" />
            </div>

            {/* Code block */}
            <div className="rounded-xl border border-border/60 overflow-hidden my-8">
              <div className="h-8 bg-muted/50 flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full skeleton" />
                <div className="w-3 h-3 rounded-full skeleton" />
                <div className="w-3 h-3 rounded-full skeleton" />
              </div>
              <div className="p-4 bg-muted/20 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-4 w-1/2 skeleton rounded" />
                <div className="h-4 w-5/6 skeleton rounded" />
                <div className="h-4 w-2/3 skeleton rounded" />
              </div>
            </div>

            {/* More paragraphs */}
            <div className="space-y-3">
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-5/6 skeleton rounded" />
              <div className="h-5 w-full skeleton rounded" />
              <div className="h-5 w-2/3 skeleton rounded" />
            </div>
          </div>

          {/* Completion section */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="h-5 w-40 skeleton rounded mb-2" />
                <div className="h-4 w-56 skeleton rounded" />
              </div>
              <div className="h-10 w-36 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </article>

      {/* Sticky bottom nav */}
      <nav className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {/* Previous */}
            <div className="h-10 w-28 skeleton rounded-lg" />

            {/* Dot indicators */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full skeleton ${i === 2 ? 'w-6' : 'w-2'}`}
                />
              ))}
            </div>

            {/* Next */}
            <div className="h-10 w-24 skeleton rounded-lg" />
          </div>
        </div>
      </nav>
    </div>
  );
}
