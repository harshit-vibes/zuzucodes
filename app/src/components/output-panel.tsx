'use client';

interface OutputPanelProps {
  output: string;
  isRunning: boolean;
  hasError: boolean;
}

export function OutputPanel({ output, isRunning, hasError }: OutputPanelProps) {
  return (
    <div className="shrink-0 h-48 border-t border-border/50 bg-zinc-950 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
        <span className="text-xs font-mono text-muted-foreground">Output</span>
        {isRunning && (
          <span className="text-xs text-muted-foreground animate-pulse">Running…</span>
        )}
      </div>

      {/* Output content */}
      <pre className="flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed">
        {!output && !isRunning && (
          <span className="text-muted-foreground/50">Output will appear here</span>
        )}
        {isRunning && !output && (
          <span className="text-muted-foreground">Running…</span>
        )}
        {output && (
          <span className={hasError ? 'text-red-400' : 'text-green-300'}>
            {output}
          </span>
        )}
      </pre>
    </div>
  );
}
