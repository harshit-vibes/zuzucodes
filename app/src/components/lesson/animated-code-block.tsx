'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CodeBlockInfo } from '@/lib/parse-lesson-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiffLineType = 'unchanged' | 'added' | 'removed';

interface DiffLine {
  type: DiffLineType;
  text: string;
}

type AnimState = 'idle' | 'animating' | 'settled';

export interface AnimatedCodeBlockProps {
  current: CodeBlockInfo;
  previous: CodeBlockInfo | null; // null for section 0 → static render
  isActive: boolean;
}

// ─── LCS Diff Algorithm ───────────────────────────────────────────────────────

function computeLineDiff(prev: string, curr: string): DiffLine[] {
  const prevLines = prev.split('\n');
  const currLines = curr.split('\n');
  const m = prevLines.length;
  const n = currLines.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (prevLines[i - 1] === currLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && prevLines[i - 1] === currLines[j - 1]) {
      result.push({ type: 'unchanged', text: prevLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: currLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: prevLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimatedCodeBlock({ current, previous, isActive }: AnimatedCodeBlockProps) {
  const [animState, setAnimState] = useState<AnimState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation state machine driven by isActive
  useEffect(() => {
    if (isActive) {
      // Clear any pending timer before re-triggering
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setAnimState('animating');
      timerRef.current = setTimeout(() => {
        setAnimState('settled');
        timerRef.current = null;
      // 1500ms > longest CSS transition (background-color 0.6s) to let animations complete
  }, 1500);
    } else {
      // Reset so re-entry re-animates
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setAnimState('idle');
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  // Memoised diff computation
  const diffLines = useMemo<DiffLine[]>(() => {
    if (previous === null) return [];
    return computeLineDiff(previous.rawContent, current.rawContent);
  }, [previous, current.rawContent]);

  // Determine whether to show plain static block or animated diff
  const hasDiff =
    previous !== null &&
    diffLines.some((l) => l.type === 'added' || l.type === 'removed');

  const showAnimated = hasDiff && animState !== 'idle';

  // ── Traffic-lights header (shared by both render paths) ──────────────────
  const header = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>
      <span className="ml-1 text-[10px] font-mono text-zinc-500 tracking-wider uppercase">
        python
      </span>
    </div>
  );

  // ── Animated diff render ─────────────────────────────────────────────────
  if (showAnimated) {
    return (
      <pre className="relative my-6 rounded-xl bg-zinc-950 text-zinc-200 overflow-x-auto border border-zinc-800/60 shadow-sm">
        {header}
        <div className="p-4">
          <code className="font-mono text-[0.82rem] leading-relaxed block">
          {diffLines.map((line, i) => (
            <span
              key={`${line.type}-${i}-${line.text}`}
              className={cn(
                'diff-line',
                line.type === 'added' && animState === 'animating' ? 'diff-line-added' : '',
                line.type === 'added' && animState === 'settled' ? 'diff-line-added-clear' : '',
                line.type === 'removed' && animState === 'animating' ? 'diff-line-removed' : '',
                line.type === 'removed' && animState === 'settled' ? 'diff-line-removed-gone' : '',
              )}
            >
              {line.text || '\u00a0'}
            </span>
          ))}
          </code>
        </div>
      </pre>
    );
  }

  // ── Plain static render ──────────────────────────────────────────────────
  return (
    <pre className="relative my-6 rounded-xl bg-zinc-950 text-zinc-200 overflow-x-auto border border-zinc-800/60 shadow-sm">
      {header}
      <div className="p-4">
        <code className="font-mono text-[0.82rem] leading-relaxed">{current.rawContent}</code>
      </div>
    </pre>
  );
}
