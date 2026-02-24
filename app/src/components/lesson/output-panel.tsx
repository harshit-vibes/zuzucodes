'use client';

import { useState } from 'react';
import { ParsedError, isAssertionError, extractAssertionMessage, formatOutput } from '@/lib/python-output';
import type { TestCaseResult } from '@/lib/judge0';

export type ExecutionPhase =
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'submitting'
  | 'submit-pass'
  | 'submit-fail'
  | 'tle';

export interface ExecutionMetrics {
  time: number | null;   // seconds
  memory: number | null; // kilobytes
}

interface OutputPanelProps {
  phase: ExecutionPhase;
  output: string;
  error: ParsedError | null;
  hasTestCases: boolean;
  submitResults: TestCaseResult[] | null;
  metrics: ExecutionMetrics | null;
}

function MetricsBadge({ metrics }: { metrics: ExecutionMetrics }) {
  const parts: string[] = [];
  if (metrics.time !== null) parts.push(`${Math.round(metrics.time * 1000)}ms`);
  if (metrics.memory !== null) parts.push(`${(metrics.memory / 1024).toFixed(1)}MB`);
  if (parts.length === 0) return null;
  return (
    <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
      {parts.join(' · ')}
    </span>
  );
}

function HeaderLabel({ phase }: { phase: ExecutionPhase }) {
  if (phase === 'running' || phase === 'submitting') {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        {phase === 'submitting' ? 'Submitting…' : 'Running…'}
      </span>
    );
  }
  if (phase === 'submit-pass') {
    return (
      <span className="text-xs text-green-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        All tests passed
      </span>
    );
  }
  if (phase === 'submit-fail') {
    return <span className="text-xs text-red-400">Tests failed</span>;
  }
  if (phase === 'tle') {
    return <span className="text-xs text-amber-400">Time limit exceeded</span>;
  }
  if (phase === 'error') {
    return <span className="text-xs text-red-400">Error</span>;
  }
  return <span className="text-xs font-mono text-muted-foreground">Output</span>;
}

function ErrorDisplay({ error }: { error: ParsedError }) {
  if (isAssertionError(error)) {
    const msg = extractAssertionMessage(error);
    return (
      <div className="p-3 space-y-2">
        <div className="text-red-400 text-xs font-mono font-semibold">Test failed</div>
        <div className="border-t border-border/40 pt-2 text-xs font-mono text-red-300/80">
          {msg || 'Assertion failed'}
        </div>
      </div>
    );
  }
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="text-red-400 text-xs font-mono font-semibold">{error.errorType}</span>
        {error.line !== null && (
          <span className="text-muted-foreground/60 text-[11px] font-mono">line {error.line}</span>
        )}
      </div>
      <div className="text-xs font-mono text-red-300/90">{error.message}</div>
      <div className="border-t border-border/30 pt-2">
        <pre className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed overflow-auto whitespace-pre-wrap">
          {error.raw}
        </pre>
      </div>
    </div>
  );
}

function OutputDisplay({ output }: { output: string }) {
  const formatted = formatOutput(output);
  if (formatted.type === 'json') {
    return (
      <pre className="flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
        {formatted.value}
      </pre>
    );
  }
  const lines = formatted.value.split('\n');
  return (
    <div className="flex-1 overflow-auto p-3">
      {lines.map((line, i) => (
        <div
          key={i}
          className="text-xs font-mono leading-relaxed text-foreground/80 hover:bg-muted/20 px-0.5 rounded"
        >
          {line || '\u00a0'}
        </div>
      ))}
    </div>
  );
}

function TestResultRow({ result }: { result: TestCaseResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors text-left"
      >
        {result.pass ? (
          <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className={`text-xs font-mono flex-1 ${result.pass ? 'text-foreground/80' : 'text-red-300/90'}`}>
          {result.d}
        </span>
        {!result.pass && (
          <svg
            className={`w-3 h-3 text-muted-foreground/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {!result.pass && open && (
        <div className="px-3 pb-2 space-y-1 ml-5">
          <div className="text-[10px] font-mono text-muted-foreground/60">
            <span className="text-muted-foreground/40">expected </span>
            <span className="text-green-400/80">{JSON.stringify(result.exp)}</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/60">
            <span className="text-muted-foreground/40">got      </span>
            <span className="text-red-400/80">{JSON.stringify(result.got)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TestResultsList({ results }: { results: TestCaseResult[] }) {
  const passed = results.filter(r => r.pass).length;
  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/50">
          {passed}/{results.length} passed
        </span>
      </div>
      {results.map((r, i) => <TestResultRow key={i} result={r} />)}
    </div>
  );
}

export function OutputPanel({ phase, output, error, hasTestCases, submitResults, metrics }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'tests'>('console');

  // Auto-switch to tests tab on submit phases
  const showTestsTab = hasTestCases;
  const isSubmitPhase = phase === 'submitting' || phase === 'submit-pass' || phase === 'submit-fail' || phase === 'tle';
  const effectiveTab = isSubmitPhase && showTestsTab ? 'tests' : activeTab;

  const isIdle = phase === 'idle';
  const isLoading = phase === 'running' || phase === 'submitting';
  const isSuccess = phase === 'success';

  return (
    <div className="shrink-0 h-48 border-t border-border bg-muted/30 dark:bg-zinc-950 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <HeaderLabel phase={phase} />
          {metrics && !isLoading && <MetricsBadge metrics={metrics} />}
        </div>
        {showTestsTab && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-2 h-5 text-[10px] font-mono rounded transition-colors ${
                effectiveTab === 'console'
                  ? 'text-foreground bg-muted dark:bg-zinc-800'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              console
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-2 h-5 text-[10px] font-mono rounded transition-colors ${
                effectiveTab === 'tests'
                  ? 'text-foreground bg-muted dark:bg-zinc-800'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              tests
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Tests tab */}
        {effectiveTab === 'tests' && showTestsTab && (
          <>
            {(phase === 'submitting') && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/50 animate-pulse">…</span>
              </div>
            )}
            {(phase === 'submit-pass' || phase === 'submit-fail') && submitResults && submitResults.length > 0 && (
              <TestResultsList results={submitResults} />
            )}
            {(phase === 'submit-pass' || phase === 'submit-fail') && (!submitResults || submitResults.length === 0) && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/40">No results</span>
              </div>
            )}
            {phase === 'tle' && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-amber-400/80">
                  Code ran too long — check for infinite loops
                </span>
              </div>
            )}
            {phase === 'error' && error && (
              <div className="flex-1 overflow-auto">
                <ErrorDisplay error={error} />
              </div>
            )}
            {(phase === 'idle' || phase === 'running' || phase === 'success') && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/30">
                  Press Submit to run tests
                </span>
              </div>
            )}
          </>
        )}

        {/* Console tab */}
        {effectiveTab === 'console' && (
          <>
            {isIdle && !output && !error && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/40">Output will appear here</span>
              </div>
            )}
            {isLoading && !output && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/50 animate-pulse">…</span>
              </div>
            )}
            {phase === 'error' && error && (
              <div className="flex-1 overflow-auto">
                <ErrorDisplay error={error} />
              </div>
            )}
            {phase === 'tle' && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-amber-400/80">Time limit exceeded</span>
              </div>
            )}
            {isSuccess && output && <OutputDisplay output={output} />}
            {isSuccess && !output && (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/40">(no output)</span>
              </div>
            )}
            {(isIdle || isLoading) && output && <OutputDisplay output={output} />}
          </>
        )}
      </div>
    </div>
  );
}
