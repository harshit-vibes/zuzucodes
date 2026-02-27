'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LessonOverlay } from '@/components/lesson/lesson-overlay';
import { Markdown } from '@/components/shared/markdown';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import { CodeEditor } from '@/components/lesson/code-editor';
import { OutputPanel, ExecutionPhase } from '@/components/lesson/output-panel';
import { parsePythonError, ParsedError } from '@/lib/python-output';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useRateLimitActions } from '@/context/rate-limit-context';
import type { TestCase, TestCaseResult, Judge0RunResult, Judge0TestsResult } from '@/lib/judge0';
import type { ExecutionMetrics } from '@/components/lesson/output-panel';

interface CodeLessonLayoutProps {
  lessonTitle: string;
  introContent: unknown | null;
  content: string;
  outroContent: unknown | null;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
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
  lastTestResults: TestCaseResult[] | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
}


export function CodeLessonLayout({
  lessonTitle,
  introContent,
  content,
  outroContent,
  codeTemplate,
  testCases,
  entryPoint,
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
  lastTestResults,
  problemSummary,
  problemConstraints,
  problemHints,
}: CodeLessonLayoutProps) {
  const router = useRouter();
  const { increment: incrementRateLimit } = useRateLimitActions();
  const [code, setCode] = useState(savedCode ?? codeTemplate ?? '');
  const [output, setOutput] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'lesson' | 'code'>('lesson');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingRef = useRef(false);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [view, setView] = useState<'intro' | 'content' | 'outro'>(() => {
    if (isCompleted || savedCode !== null) return 'content';
    if (typeof window !== 'undefined' && sessionStorage.getItem(`intro:${lessonId}`)) return 'content';
    return 'intro';
  });

  // Hydrate output panel with persisted test results on mount
  useEffect(() => {
    if (lastTestResults && lastTestResults.length > 0) {
      const allPassed = lastTestResults.every(r => r.pass);
      setTestResults(lastTestResults);
      setExecutionPhase(allPassed ? 'run-pass' : 'run-fail');
      setHasRun(true);
    }
  }, []); // intentional: mount-only

  const hasNext = position < lessonCount;
  const hasPrev = position > 1;

  const nextHref = hasNext
    ? `/dashboard/course/${courseId}/${moduleId}/lesson/${position + 1}`
    : `/dashboard/course/${courseId}/${moduleId}/quiz`;

  const prevHref = `/dashboard/course/${courseId}/${moduleId}/lesson/${position - 1}`;

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
        // silently swallow
      }
    }, 1500);
  }, [isAuthenticated, lessonId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    try {
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
      setTestResults(null);
      setMetrics(null);

      try {
        const hasTests = !!(testCases && testCases.length > 0 && entryPoint);

        const runPromise = fetch('/api/code/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const testPromise = hasTests
          ? fetch('/api/code/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, testCases, entryPoint }),
            })
          : null;

        const [runRes, testRes] = await Promise.all([runPromise, testPromise ?? Promise.resolve(null)]);

        if (!runRes.ok) {
          const msg = 'Execution service unavailable';
          setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
          setExecutionPhase('error');
          return;
        }

        const runResult = await runRes.json() as Judge0RunResult;
        const { stdout, stderr, statusId, time, memory } = runResult;

        setMetrics({ time: time ?? null, memory: memory ?? null });

        if (statusId === 5) {
          setExecutionPhase('tle');
          return;
        }

        if (stderr || (statusId !== 3 && statusId !== 0)) {
          const errorText = stderr || `Runtime error (status ${statusId})`;
          setParsedError(parsePythonError(errorText.trim()));
          setExecutionPhase('error');
          return;
        }

        setHasRun(true);
        setOutput((stdout ?? '').trim());

        if (testRes && testRes.ok) {
          const testResult = await testRes.json() as Judge0TestsResult;
          setTestResults(testResult.tests);
          setExecutionPhase(testResult.allPassed ? 'run-pass' : 'run-fail');

          if (isAuthenticated) {
            fetch('/api/code/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lessonId, code, testResults: testResult.tests }),
            }).catch(() => {});
          }

          if (testResult.allPassed) {
            router.refresh();
            const confetti = (await import('canvas-confetti')).default;
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { x: 0.5, y: 1 },
              colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
              disableForReducedMotion: true,
            });
            if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
            viewTimerRef.current = setTimeout(() => setView('outro'), 1800);
          }
        } else {
          setExecutionPhase('run-pass');
        }
      } catch (err: unknown) {
        const message = (err as Error).message ?? 'Network error';
        setParsedError({ errorType: 'Error', message, line: null, raw: message });
        setExecutionPhase('error');
      }
    } finally {
      isExecutingRef.current = false;
    }
  };

  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full overflow-y-auto px-8 py-6">
      <Markdown content={content} />
    </div>
  );

  // ─── Code Pane ──────────────────────────────────────────────────────────────
  const CodePane = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Problem panel — pinned above editor, hidden for theory-only lessons */}
      {problemSummary && (
        <ProblemPanel
          problemSummary={problemSummary}
          problemConstraints={problemConstraints}
          problemHints={problemHints}
          testCases={testCases}
          entryPoint={entryPoint}
          onViewSolution={solutionCode ? () => handleCodeChange(solutionCode) : undefined}
        />
      )}
      <div className="shrink-0 h-9 flex items-center justify-between px-3 bg-muted/50 dark:bg-zinc-800 border-b border-border dark:border-zinc-700">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">editor</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="font-mono text-[10px] text-muted-foreground">saved</span>
          )}
          <button
            onClick={handleRun}
            disabled={executionPhase === 'running'}
            className="flex items-center gap-1 px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
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
        <OutputPanel
          phase={executionPhase}
          output={output}
          error={parsedError}
          hasTestCases={!!(testCases && testCases.length > 0)}
          hasRun={hasRun}
          testResults={testResults}
          metrics={metrics}
        />
      </div>
    </div>
  );

  // ─── Header ─────────────────────────────────────────────────────────────────
  const Header = (
    <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <SidebarTrigger className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0" />
      <div className="w-px h-5 bg-border/50 shrink-0" />
      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider uppercase hidden sm:block shrink-0">
          {moduleTitle}
        </span>
        <span className="text-border/40 hidden sm:block shrink-0 text-xs">/</span>
        <span className="text-sm font-medium text-foreground truncate">{lessonTitle}</span>
        {isCompleted && (
          <span className="hidden sm:block font-mono text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/70 ring-1 ring-success/20 shrink-0">
            completed
          </span>
        )}
      </div>
      <div className="w-px h-5 bg-border/50 shrink-0" />
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        {isAuthenticated && <UserButton />}
      </div>
    </header>
  );

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {Header}
      {view !== 'content' ? (
        <LessonOverlay
          view={view}
          introContent={introContent}
          outroContent={outroContent}
          lessonTitle={lessonTitle}
          position={position}
          lessonCount={lessonCount}
          prevHref={prevHref}
          nextHref={nextHref}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onEnterLesson={() => {
            sessionStorage.setItem(`intro:${lessonId}`, '1');
            setView('content');
          }}
        />
      ) : (
        <>
          <div className="md:hidden shrink-0 flex border-b border-border bg-muted/50 dark:bg-zinc-900">
            <button onClick={() => setActiveTab('lesson')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'lesson' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>lesson</button>
            <button onClick={() => setActiveTab('code')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors ${activeTab === 'code' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>code</button>
          </div>
          <div className="md:hidden flex-1 overflow-hidden flex flex-col">
            {activeTab === 'lesson' ? ProsePane : CodePane}
          </div>
          <div className="hidden md:flex flex-1 overflow-hidden">
            <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">{ProsePane}</div>
            <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-zinc-950">{CodePane}</div>
          </div>
        </>
      )}
    </div>
  );
}
