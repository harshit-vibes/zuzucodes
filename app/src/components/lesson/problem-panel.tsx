'use client';

import { useState } from 'react';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: ProblemPanelProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);

  return (
    <div className="px-6 py-5 space-y-4 bg-background dark:bg-zinc-950 overflow-y-auto">

      {/* Summary */}
      <p className="text-base text-foreground/80 leading-relaxed">
        {problemSummary}
      </p>

      {/* Examples */}
      {visibleExamples.length > 0 && entryPoint && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">examples</span>
          <div className="space-y-1.5">
            {visibleExamples.map((tc, i) => (
              <div key={i} className="font-mono text-sm bg-muted/40 dark:bg-zinc-800/60 rounded px-3 py-2 flex items-center gap-2">
                <span className="text-foreground/70">
                  {entryPoint}({tc.args.map(a => JSON.stringify(a)).join(', ')})
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-emerald-400/90">{JSON.stringify(tc.expected)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints */}
      {problemConstraints.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">constraints</span>
          <div className="flex flex-wrap gap-2">
            {problemConstraints.map((c, i) => (
              <span key={i} className="font-mono text-xs text-muted-foreground/70 bg-muted/40 dark:bg-zinc-800/60 rounded px-2.5 py-1">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hints */}
      {problemHints.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">hints</span>
          {problemHints.slice(0, hintsRevealed).map((hint, i) => (
            <div key={i} className="text-sm text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-3 py-2 border border-border/30">
              {hint}
            </div>
          ))}
          {hintsRevealed < problemHints.length && (
            <button
              onClick={() => setHintsRevealed(h => h + 1)}
              className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              show hint {hintsRevealed + 1}/{problemHints.length} →
            </button>
          )}
        </div>
      )}

    </div>
  );
}
