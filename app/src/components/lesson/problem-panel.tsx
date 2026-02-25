'use client';

import { useState, useEffect } from 'react';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
  lessonId: string;
}

export function ProblemPanel({ problemSummary, problemConstraints, problemHints, testCases, entryPoint, lessonId }: ProblemPanelProps) {
  const storageKey = `problem-panel-collapsed:${lessonId}`;
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  // Restore collapse state from localStorage (null = not yet hydrated)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setCollapsed(stored === 'true');
  }, [storageKey]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);
  const hints = problemHints;
  const constraints = problemConstraints;

  return (
    <div className="shrink-0 border-b border-border dark:border-zinc-700">
      {/* Toolbar */}
      <button
        onClick={toggleCollapsed}
        className="w-full h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 hover:bg-muted dark:hover:bg-zinc-700 transition-colors"
      >
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">problem</span>
        <svg
          className={`w-3 h-3 text-muted-foreground/50 transition-transform ${collapsed === true ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {collapsed === false && (
        <div className="px-4 py-3 space-y-3 bg-background dark:bg-zinc-950 max-h-56 overflow-y-auto">

          {/* Summary */}
          <p className="text-sm text-foreground/80 leading-relaxed">
            {problemSummary}
          </p>

          {/* Examples */}
          {visibleExamples.length > 0 && entryPoint && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">examples</span>
              <div className="space-y-1">
                {visibleExamples.map((tc, i) => (
                  <div key={i} className="font-mono text-xs bg-muted/40 dark:bg-zinc-800/60 rounded px-2.5 py-1.5 flex items-center gap-2">
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
          {constraints.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">constraints</span>
              <div className="flex flex-wrap gap-1.5">
                {constraints.map((c, i) => (
                  <span key={i} className="font-mono text-[11px] text-muted-foreground/70 bg-muted/40 dark:bg-zinc-800/60 rounded px-2 py-0.5">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">hints</span>
              {hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="text-xs text-muted-foreground/70 bg-muted/30 dark:bg-zinc-800/40 rounded px-2.5 py-1.5 border border-border/30">
                  {hint}
                </div>
              ))}
              {hintsRevealed < hints.length && (
                <button
                  onClick={() => setHintsRevealed(h => h + 1)}
                  className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  show hint {hintsRevealed + 1}/{hints.length} →
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
