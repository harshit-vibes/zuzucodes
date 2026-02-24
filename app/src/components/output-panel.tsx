'use client';

import { ParsedError, isAssertionError, extractAssertionMessage, formatOutput } from '@/lib/python-output';

export type ExecutionPhase = 'idle' | 'running' | 'success' | 'error';

interface OutputPanelProps {
  phase: ExecutionPhase;
  output: string;
  error: ParsedError | null;
  hasTestCode: boolean;
}

function HeaderLabel({ phase, hasTestCode }: { phase: ExecutionPhase; hasTestCode: boolean }) {
  if (phase === 'running') {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">Running…</span>
    );
  }
  if (phase === 'success' && hasTestCode) {
    return (
      <span className="text-xs text-green-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Tests passed
      </span>
    );
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

export function OutputPanel({ phase, output, error, hasTestCode }: OutputPanelProps) {
  const isIdle = phase === 'idle';
  const isLoading = phase === 'running';
  const isSuccess = phase === 'success';

  return (
    <div className="shrink-0 h-48 border-t border-border bg-muted/30 dark:bg-zinc-950 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <HeaderLabel phase={phase} hasTestCode={hasTestCode} />
      </div>

      {/* Output content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Idle — no output yet */}
        {isIdle && !output && !error && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground/40">Output will appear here</span>
          </div>
        )}

        {/* Loading spinner placeholder */}
        {isLoading && !output && !error && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground/50 animate-pulse">…</span>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && error && (
          <div className="flex-1 overflow-auto">
            <ErrorDisplay error={error} />
          </div>
        )}

        {/* Success with test code — green check already in header, show "All tests passed!" */}
        {isSuccess && hasTestCode && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-mono text-green-400">All tests passed!</span>
          </div>
        )}

        {/* Success without test code — show stdout */}
        {isSuccess && !hasTestCode && output && (
          <OutputDisplay output={output} />
        )}

        {/* Success without test code — empty stdout */}
        {isSuccess && !hasTestCode && !output && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground/40">(no output)</span>
          </div>
        )}

        {/* Idle with output (e.g. previous run) */}
        {isIdle && output && !error && (
          <OutputDisplay output={output} />
        )}
      </div>
    </div>
  );
}
