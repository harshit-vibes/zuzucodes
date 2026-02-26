'use client';

import { useState } from 'react';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
  onViewSolution?: () => void;
}

export function ProblemPanel({
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
  onViewSolution,
}: ProblemPanelProps) {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  const visibleExamples = (testCases ?? []).filter(tc => tc.visible);
  const hasHints = problemHints.length > 0;
  const isLastHint = problemHints.length > 0 && hintIndex === problemHints.length - 1;

  function handleClose() {
    setHintsOpen(false);
    setHintIndex(0);
  }

  function handleViewSolution() {
    onViewSolution?.();
    handleClose();
  }

  return (
    <div className="relative border-b border-border/50 dark:border-zinc-700/50 bg-background dark:bg-zinc-950 overflow-hidden">
      {/* Main content */}
      <div className="px-4 py-3 space-y-2.5">

        {/* Header row: label + hints button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            challenge
          </span>
          {hasHints && (
            <button
              onClick={() => setHintsOpen(true)}
              aria-label="Show hints"
              className="flex items-center gap-1 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[9px] font-mono">hints</span>
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm font-medium text-foreground/80 leading-relaxed">
          {problemSummary}
        </p>

        {/* Examples */}
        {visibleExamples.length > 0 && entryPoint && (
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
        )}

        {/* Constraints as compact pills */}
        {problemConstraints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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

      {/* Hint overlay — slides in from right, covers entire panel */}
      <div
        aria-hidden={!hintsOpen}
        className={`absolute inset-0 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-sm transition-transform duration-200 ease-out flex flex-col px-4 py-3 ${
          hintsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            hint {hintIndex + 1} / {problemHints.length}
          </span>
          <button
            onClick={handleClose}
            aria-label="Close hints"
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hint text */}
        <div className="flex-1 min-h-0">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {problemHints[hintIndex]}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3 shrink-0">
          <button
            onClick={() => setHintIndex(i => i - 1)}
            disabled={hintIndex === 0}
            className="text-xs font-mono text-muted-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← prev
          </button>
          {isLastHint ? (
            <button
              onClick={handleViewSolution}
              className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              view solution →
            </button>
          ) : (
            <button
              onClick={() => setHintIndex(i => i + 1)}
              className="text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
