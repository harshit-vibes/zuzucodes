'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { ExecutionPhase, ExecutionMetrics } from '@/components/lesson/output-panel';
import { parsePythonError, ParsedError } from '@/lib/python-output';
import type { TestCase, TestCaseResult, Judge0RunResult, Judge0TestsResult } from '@/lib/judge0';

const CodeEditor = dynamic(
  () => import('@/components/lesson/code-editor').then(m => m.CodeEditor),
  { ssr: false, loading: () => <div className="flex-1 bg-zinc-950 animate-pulse" /> }
);
const ProblemPanel = dynamic(
  () => import('@/components/lesson/problem-panel').then(m => m.ProblemPanel),
  { ssr: false }
);
const OutputPanel = dynamic(
  () => import('@/components/lesson/output-panel').then(m => m.OutputPanel),
  { ssr: false }
);

interface CodeLessonLayoutProps {
  lessonTitle: string;
  children: React.ReactNode;
  outroHref: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  savedCode: string | null;
  lessonId: string;
  courseId: string;
  moduleId: string;
  isAuthenticated: boolean;
  isCompleted: boolean;
  lastTestResults: TestCaseResult[] | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
}

export function CodeLessonLayout({
  lessonTitle: _lessonTitle,
  children,
  outroHref,
  codeTemplate,
  testCases,
  entryPoint,
  solutionCode,
  savedCode,
  lessonId,
  courseId: _courseId,
  moduleId: _moduleId,
  isAuthenticated,
  isCompleted: _isCompleted,
  lastTestResults,
  problemSummary,
  problemConstraints,
  problemHints,
}: CodeLessonLayoutProps) {
  const router = useRouter();
  const [code, setCode] = useState(savedCode ?? codeTemplate ?? '');
  const [output, setOutput] = useState('');
  const [parsedError, setParsedError] = useState<ParsedError | null>(null);
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>(() =>
    lastTestResults && lastTestResults.length > 0
      ? (lastTestResults.every(r => r.pass) ? 'run-pass' : 'run-fail')
      : 'idle'
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'lesson' | 'code'>('lesson');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExecutingRef = useRef(false);
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(
    () => (lastTestResults && lastTestResults.length > 0 ? lastTestResults : null)
  );
  const [hasRun, setHasRun] = useState(() => !!(lastTestResults && lastTestResults.length > 0));
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);

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
      if (outroTimerRef.current) clearTimeout(outroTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    try {
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
          setParsedError({ errorType: 'NetworkError', message: msg, line: null, raw: msg });
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
            if (outroTimerRef.current) clearTimeout(outroTimerRef.current);
            outroTimerRef.current = setTimeout(() => router.push(outroHref), 1800);
          }
        } else {
          setExecutionPhase('run-pass');
        }
      } catch (err: unknown) {
        const message = (err as Error).message ?? 'Network error';
        setParsedError({ errorType: 'NetworkError', message, line: null, raw: message });
        setExecutionPhase('error');
      }
    } finally {
      isExecutingRef.current = false;
    }
  };

  // ─── Prose Pane ─────────────────────────────────────────────────────────────
  const ProsePane = (
    <div className="h-full overflow-y-auto px-8 py-6">
      {children}
    </div>
  );

  // ─── Code Pane ──────────────────────────────────────────────────────────────
  const CodePane = (
    <div className="flex flex-col flex-1 overflow-hidden">
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
            <svg aria-hidden="true" className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {executionPhase === 'running' ? 'running…' : 'run'}
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

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="md:hidden shrink-0 flex border-b border-border bg-muted/50 dark:bg-zinc-900">
        <button aria-label="Lesson content" onClick={() => setActiveTab('lesson')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${activeTab === 'lesson' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>lesson</button>
        <button aria-label="Code editor" onClick={() => setActiveTab('code')} className={`flex-1 py-2.5 text-xs font-mono tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${activeTab === 'code' ? 'text-primary border-b border-primary' : 'text-muted-foreground hover:text-foreground'}`}>code</button>
      </div>
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {activeTab === 'lesson' ? ProsePane : CodePane}
      </div>
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">{ProsePane}</div>
        <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-zinc-950">{CodePane}</div>
      </div>
    </div>
  );
}
