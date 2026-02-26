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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: ProblemPanelProps) {
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);

  return (
    <div className="overflow-y-auto border-b border-border/50 dark:border-zinc-700/50 bg-background dark:bg-zinc-950" style={{ maxHeight: '40%' }}>
      <div className="px-4 py-3 space-y-3">

        {/* Summary */}
        <div>
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            challenge
          </span>
          <p className="text-sm font-medium text-foreground/80 leading-relaxed mt-1">
            {problemSummary}
          </p>
        </div>

        {/* Examples */}
        {visibleExamples.length > 0 && entryPoint && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
              examples
            </span>
            <div className="space-y-1">
              {visibleExamples.map((tc, i) => (
                <div
                  key={i}
                  className="font-mono text-xs bg-muted/40 dark:bg-zinc-900 rounded px-2.5 py-1.5 flex items-center gap-2 border-l-2 border-primary/30"
                >
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

        {/* Constraints — collapsible */}
        {problemConstraints.length > 0 && (
          <div>
            <button
              onClick={() => setConstraintsOpen(o => !o)}
              aria-expanded={constraintsOpen}
              aria-controls="constraints-region"
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                constraints
              </span>
              <ChevronIcon open={constraintsOpen} />
            </button>
            {constraintsOpen && (
              <div id="constraints-region" className="mt-1.5 flex flex-wrap gap-1.5">
                {problemConstraints.map((c, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs text-muted-foreground/70 ring-1 ring-border/40 rounded px-2 py-0.5"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hints — collapsible, reveal one at a time */}
        {problemHints.length > 0 && (
          <div>
            <button
              onClick={() => {
                if (hintsOpen) setHintsRevealed(0);
                setHintsOpen(o => !o);
              }}
              aria-expanded={hintsOpen}
              aria-controls="hints-region"
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider flex-1">
                hints
              </span>
              <ChevronIcon open={hintsOpen} />
            </button>
            {hintsOpen && (
              <div id="hints-region" className="mt-1.5 space-y-1.5">
                {problemHints.slice(0, hintsRevealed).map((hint, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-3 py-2 border border-border/30"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground/40 block mb-1">
                      hint {i + 1}
                    </span>
                    {hint}
                  </div>
                ))}
                {hintsRevealed < problemHints.length && (
                  <button
                    onClick={() => setHintsRevealed(h => h + 1)}
                    aria-label={`Show hint ${hintsRevealed + 1} of ${problemHints.length}`}
                    className="text-xs font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    show hint {hintsRevealed + 1}/{problemHints.length} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
