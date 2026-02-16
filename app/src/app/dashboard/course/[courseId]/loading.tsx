export default function CourseLoading() {
  return (
    <div className="min-h-screen">
      {/* Header with horizontal layout */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-14 skeleton rounded" />
            <div className="h-4 w-4 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Course thumbnail - larger card style */}
            <div className="relative w-full lg:w-80 h-48 lg:h-52 rounded-xl overflow-hidden skeleton">
              {/* Subtle gradient overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Course info */}
            <div className="flex-1 py-2">
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-20 skeleton rounded-md" />
                <div className="h-6 w-16 skeleton rounded-md" />
                <div className="h-6 w-24 skeleton rounded-md" />
              </div>

              {/* Course title - large */}
              <div className="h-10 w-3/4 skeleton rounded mb-4" />

              {/* Description lines */}
              <div className="space-y-2 mb-6">
                <div className="h-5 w-full skeleton rounded" />
                <div className="h-5 w-5/6 skeleton rounded" />
              </div>

              {/* Author row */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 skeleton rounded-full" />
                <div className="h-4 w-28 skeleton rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules content */}
      <div className="container mx-auto px-6 py-10">
        <div className="max-w-3xl">
          {/* Section title with accent bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 skeleton rounded-full" />
            <div className="h-6 w-36 skeleton rounded" />
          </div>

          {/* Module accordion cards */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
                {/* Module header */}
                <div className="px-5 py-4 bg-muted/30">
                  <div className="flex items-start gap-4">
                    {/* Module icon */}
                    <div className="w-10 h-10 skeleton rounded-lg flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="h-5 w-48 skeleton rounded mb-2" />
                      <div className="h-4 w-72 skeleton rounded" />
                    </div>

                    {/* Toggle icon placeholder */}
                    <div className="w-6 h-6 skeleton rounded" />
                  </div>
                </div>

                {/* Lessons list */}
                <div className="divide-y divide-border/50">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-4 px-5 py-3.5">
                      {/* Lesson number badge */}
                      <div className="w-7 h-7 skeleton rounded-full flex-shrink-0" />

                      {/* Lesson title */}
                      <div className="h-4 w-44 skeleton rounded" />

                      {/* Duration */}
                      <div className="ml-auto h-4 w-16 skeleton rounded" />
                    </div>
                  ))}

                  {/* Quiz row */}
                  <div className="flex items-center gap-4 px-5 py-3.5 bg-muted/20">
                    <div className="w-7 h-7 skeleton rounded-lg flex-shrink-0" />
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="ml-auto h-5 w-12 skeleton rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
