'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Markdown } from '@/components/shared/markdown';
import { CodeEditor } from '@/components/lesson/code-editor';
import { OutputPanel, ExecutionPhase } from '@/components/lesson/output-panel';
import { parsePythonError, ParsedError } from '@/lib/python-output';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useRateLimitActions } from '@/context/rate-limit-context';

interface CodeLessonLayoutProps {
  lessonTitle: string;
  content: string;
  codeTemplate: string | null;
  testCode: string | null;
  solutionCode: string | null;
  savedCode: string | null;
  lessonId: string;
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  position: number;
  lessonCount: number;
  isAuthenticated: boolean;
  isCompleted: boolean;
}


export function CodeLessonLayout({
  lessonTitle,
  content,
  codeTemplate,
  testCode,
  solutionCode,
  savedCode,
  lessonId,
  courseId,
  moduleId,
  moduleTitle,
  position,
  lessonCount,
  isAuthenticated,
  isCompleted,
}: CodeLessonLayoutProps) {
  const router = useRouter();
  const { increment: incrementRateLimit } = useRateLimitActions();
  const [code, setCode] = useState(savedCode ?? codeTemplate ?? '');
  const [output, setOutput] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [testPassed, setTestPassed] = useState(false);
  const [activeTab, setActiveTab] = useState<'lesson' | 'code'>('lesson');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCode = !!(testCode || codeTemplate);
  const hasNext = position < lessonCount;
  const hasPrev = position > 1;
  const progress = (position / lessonCount) * 100;

  const nextHref = hasNext
    ? `/dashboard/course/${courseId}/${moduleId}/lesson/${position + 1}`
    : `/dashboard/course/${courseId}/${moduleId}/quiz`;

  const prevHref = `/dashboard/course/${courseId}/${moduleId}/lesson/${position - 1}`;

  // Auto-save: 1500ms debounce
  const handleCodeChange = useCallback((val: string) => {
    setCode(val);
    if (!isAuthenticated) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/code/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, code: val }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        // silently swallow — in-memory code is preserved
      }
    }, 1500);
  }, [isAuthenticated, lessonId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    // Limit guard + optimistic increment (reads localStorage directly — always accurate)
    if (!incrementRateLimit()) {
      setParsedError({
        errorType: 'LimitError',
        message: 'Daily limit reached · see footer for reset time',
        line: null,
        raw: '',
      });
      setExecutionPhase('error');
      return;
    }

    setExecutionPhase('running');
    setOutput('');
    setParsedError(null);
    setTestPassed(false);

    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, testCode }),
      });

      if (!res.ok) {
        const msg = 'Execution service unavailable';
        setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
        setExecutionPhase('error');
        return;
      }

      const result = await res.json();
      const { stdout, stderr, statusId } = result;

      // statusId 3 = Accepted, anything else with stderr = error
      if (stderr || (statusId !== 3 && statusId !== 0)) {
        const errorText = stderr || `Runtime error (status ${statusId})`;
        setParsedError(parsePythonError(errorText.trim()));
        setExecutionPhase('error');
      } else if (testCode) {
        setTestPassed(true);
        setExecutionPhase('success');

        if (isAuthenticated && !isCompleted) {
          fetch('/api/progress/lesson', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, courseId }),
          }).catch(() => {});
        }

        await new Promise(resolve => setTimeout(resolve, 700));
        router.push(nextHref);
      } else {
        setOutput(stdout.trim());
        setExecutionPhase('success');
      }
    } catch (err: unknown) {
      const message = (err as Error).message ?? 'Network error';
      setParsedError({ errorType: 'Error', message, line: null, raw: message });
      setExecutionPhase('error');
    }
  };

  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full overflow-y-auto">
      <div className="px-8 pt-8 pb-12">
        <h1 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight leading-tight text-foreground mb-8">
          {lessonTitle}
        </h1>
        <div className="prose-container">
          {content ? (
            <Markdown content={content} />
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground">No content available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Code Pane ──────────────────────────────────────────────────────────────
  const CodePane = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Editor toolbar */}
      <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 border-b border-border dark:border-zinc-700">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">editor</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="font-mono text-[10px] text-muted-foreground">saved</span>
          )}
          <button
            onClick={() => solutionCode && handleCodeChange(solutionCode)}
            className="px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted dark:hover:bg-zinc-700 transition-colors"
          >
            solution
          </button>
          <button
            onClick={handleRun}
            disabled={executionPhase === 'running'}
            className="flex items-center gap-1 px-2.5 h-6 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-[11px] font-mono disabled:opacity-50 transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {executionPhase === 'running' ? 'running···' : 'run'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <CodeEditor value={code} onChange={handleCodeChange} />
        <OutputPanel phase={executionPhase} output={output} error={parsedError} hasTestCode={!!testCode} />
      </div>
    </div>
  );

  // ─── Unified Header ─────────────────────────────────────────────────────────
  const Header = (
    <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">

      {/* Sidebar toggle */}
      <SidebarTrigger className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0" />

      <div className="w-px h-5 bg-border/50 shrink-0" />

      {/* Lesson path */}
      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider uppercase hidden sm:block shrink-0">
          {moduleTitle}
        </span>
        <span className="text-border/40 hidden sm:block shrink-0 text-xs">/</span>
        <span className="text-sm font-medium text-foreground truncate">
          {lessonTitle}
        </span>
      </div>

      {/* Progress + completion */}
      <div className="flex items-center gap-2.5 shrink-0">
        {isCompleted && !testPassed && (
          <div
            className="flex items-center justify-center w-4 h-4 rounded-full bg-success/15 ring-1 ring-success/40"
            title="Lesson complete"
          >
            <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <div className="w-16 h-0.5 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums">
          {position}/{lessonCount}
        </span>
      </div>

      <div className="w-px h-5 bg-border/50 shrink-0" />

      {/* Theme + user */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        {isAuthenticated && <UserButton />}
      </div>

    </header>
  );

  // ─── Unified Footer ──────────────────────────────────────────────────────────
  const Footer = (
    <footer className="shrink-0 bg-muted/50 dark:bg-zinc-900 border-t border-border dark:border-zinc-800">
      <div className="h-11 px-4 flex items-center justify-between gap-3">

        {/* Left: prev */}
        {hasPrev ? (
          <Link
            href={prevHref}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            prev
          </Link>
        ) : (
          <div className="shrink-0 w-14" />
        )}

        {/* Center: lesson dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: lessonCount }, (_, i) => (
            <Link
              key={i}
              href={`/dashboard/course/${courseId}/${moduleId}/lesson/${i + 1}`}
              className={`block rounded-full transition-all ${
                i + 1 === position
                  ? 'bg-primary w-5 h-1.5'
                  : i + 1 < position
                  ? 'bg-muted-foreground/50 w-1.5 h-1.5 hover:bg-muted-foreground/70'
                  : 'bg-muted-foreground/20 w-1.5 h-1.5 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Theory lesson — no code — just navigate */}
          {!hasCode && (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 px-3 h-7 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-mono transition-colors"
            >
              {hasNext ? 'continue' : 'take quiz'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Code lesson — manual continue (no test) */}
          {hasCode && !testCode && (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 px-3 h-7 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-mono transition-colors"
            >
              {hasNext ? 'continue' : 'take quiz'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

        </div>
      </div>
    </footer>
  );

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {Header}

      {/* Mobile: tab bar */}
      <div className="md:hidden shrink-0 flex border-b border-border bg-muted/50 dark:bg-zinc-900">
        <button
          onClick={() => setActiveTab('lesson')}
          className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${
            activeTab === 'lesson'
              ? 'text-primary border-b border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          lesson
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${
            activeTab === 'code'
              ? 'text-primary border-b border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          code
        </button>
      </div>

      {/* Mobile: single active pane */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {activeTab === 'lesson' ? ProsePane : CodePane}
      </div>

      {/* Desktop: split pane */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">
          {ProsePane}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-zinc-950">
          {CodePane}
        </div>
      </div>

      {Footer}

    </div>
  );
}
