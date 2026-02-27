import type { ConfidenceQuestion } from '@/lib/data';

interface ReportCardProps {
  questions: ConfidenceQuestion[];
  onboarding: Record<string, number>;
  completion: Record<string, number>;
}

export function ReportCard({ questions, onboarding, completion }: ReportCardProps) {
  const avgDelta =
    questions.length > 0
      ? questions.reduce(
          (sum, q) => sum + ((completion[q.id] ?? 0) - (onboarding[q.id] ?? 0)),
          0,
        ) / questions.length
      : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          Your progress
        </p>
        <h2 className="text-base font-semibold text-foreground">Confidence Report</h2>
      </div>

      <div className="space-y-4">
        {questions.map(q => {
          const before = onboarding[q.id] ?? 0;
          const after = completion[q.id] ?? 0;
          const delta = after - before;

          return (
            <div key={q.id} className="space-y-1.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{q.statement}</p>
              <div className="flex items-center gap-3">
                {/* Before dots */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i <= before ? 'bg-muted-foreground/40' : 'bg-muted-foreground/10'
                      }`}
                    />
                  ))}
                </div>

                <svg
                  className="w-3 h-3 text-muted-foreground/30 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>

                {/* After dots */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i <= after ? 'bg-success/70' : 'bg-muted-foreground/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Delta badge */}
                <span
                  className={`font-mono text-[11px] shrink-0 ${
                    delta > 0
                      ? 'text-success'
                      : delta === 0
                      ? 'text-muted-foreground/40'
                      : 'text-destructive'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta === 0 ? '=' : `${delta}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Average */}
      <div className="pt-3 border-t border-border/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Average improvement</span>
        <span
          className={`font-mono text-sm font-semibold ${
            avgDelta > 0 ? 'text-success' : 'text-muted-foreground'
          }`}
        >
          {avgDelta > 0 ? '+' : ''}
          {avgDelta.toFixed(1)} pts
        </span>
      </div>
    </div>
  );
}
