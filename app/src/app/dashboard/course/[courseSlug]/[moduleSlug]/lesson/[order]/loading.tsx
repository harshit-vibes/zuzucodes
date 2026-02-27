export default function LessonLoading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Shell header skeleton */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50">
        <div className="w-7 h-7 skeleton rounded shrink-0" />
        <div className="w-px h-5 bg-border/30 shrink-0" />
        <div className="h-2.5 w-28 skeleton rounded shrink-0" />
        <div className="h-3.5 w-44 skeleton rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 skeleton rounded-lg shrink-0" />
        <div className="w-8 h-8 skeleton rounded-full shrink-0" />
      </div>

      {/* Split pane content — mirrors CodeLessonLayout */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
        {/* Prose pane — left */}
        <div className="hidden md:flex md:w-[48%] border-r border-border/50 flex-col px-8 py-6 space-y-4 overflow-hidden">
          <div className="h-5 w-full skeleton rounded" />
          <div className="h-5 w-11/12 skeleton rounded" />
          <div className="h-5 w-4/5 skeleton rounded" />
          <div className="h-5 w-full skeleton rounded mt-2" />
          <div className="h-5 w-5/6 skeleton rounded" />
          <div className="h-6 w-40 skeleton rounded mt-4" />
          <div className="h-5 w-full skeleton rounded" />
          <div className="h-5 w-3/4 skeleton rounded" />
        </div>

        {/* Code pane — right */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="shrink-0 h-9 flex items-center justify-between px-3 border-b border-border bg-muted/50">
            <div className="h-2.5 w-10 skeleton rounded" />
            <div className="h-6 w-10 skeleton rounded" />
          </div>
          {/* Code lines */}
          <div className="flex-1 bg-background p-4 space-y-2 overflow-hidden">
            <div className="h-4 w-1/2 skeleton rounded" />
            <div className="h-4 w-3/4 skeleton rounded" />
            <div className="h-4 w-2/5 skeleton rounded" />
            <div className="h-4 w-5/6 skeleton rounded" />
            <div className="h-4 w-1/3 skeleton rounded" />
            <div className="h-4 w-2/3 skeleton rounded" />
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
