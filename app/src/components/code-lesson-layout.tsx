'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/breadcrumb';
import { Markdown } from '@/components/markdown';
import { LessonCompletion } from '@/components/lesson-completion';
import { CodeEditor } from '@/components/code-editor';
import { OutputPanel } from '@/components/output-panel';

// Pyodide singleton — persists across lesson navigations
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

async function getPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    // Inject CDN script if not present
    if (!(window as any).loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        document.head.appendChild(script);
      });
    }
    pyodideInstance = await (window as any).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
    });
    return pyodideInstance;
  })();

  return pyodideLoading;
}

interface CodeLessonLayoutProps {
  lessonTitle: string;
  content: string;
  codeTemplate: string | null;
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
  const [code, setCode] = useState(savedCode ?? codeTemplate ?? '');
  const [output, setOutput] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'lesson' | 'code'>('lesson');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasNext = position < lessonCount;
  const hasPrev = position > 1;
  const progress = (position / lessonCount) * 100;

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
        // silently swallow — user's in-memory code is preserved
      }
    }, 1500);
  }, [isAuthenticated, lessonId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setHasError(false);

    try {
      const pyodide = await getPyodide();

      // Capture stdout/stderr
      let stdout = '';
      let stderr = '';
      pyodide.setStdout({ batched: (text: string) => { stdout += text + '\n'; } });
      pyodide.setStderr({ batched: (text: string) => { stderr += text + '\n'; } });

      await pyodide.runPythonAsync(code);

      if (stderr) {
        setOutput(stderr.trim());
        setHasError(true);
      } else {
        setOutput(stdout.trim() || '(no output)');
        setHasError(false);
      }
    } catch (err: unknown) {
      setOutput((err as any)?.message ?? String(err));
      setHasError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: moduleTitle },
  ];

  const ProsePane = (
    <div className="overflow-y-auto px-8 py-10">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="label-mono text-muted-foreground text-sm flex-shrink-0">
          {position}/{lessonCount}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight mb-8">
        {lessonTitle}
      </h1>

      {/* Content */}
      <div className="prose-container">
        {content ? (
          <Markdown content={content} />
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No content available yet.</p>
          </div>
        )}
      </div>

      {/* Completion */}
      {isAuthenticated && (
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-foreground mb-1">
                {isCompleted ? 'Lesson Complete!' : 'Finished this lesson?'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isCompleted
                  ? 'Great progress! Continue to the next lesson.'
                  : 'Mark it complete to track your progress.'}
              </p>
            </div>
            <LessonCompletion
              lessonId={lessonId}
              courseId={courseId}
              isInitiallyCompleted={isCompleted}
            />
          </div>
        </div>
      )}
    </div>
  );

  const CodePane = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Editor toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-zinc-900">
        <span className="text-xs font-mono text-muted-foreground">Python</span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-xs text-muted-foreground transition-opacity">Saved</span>
          )}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {isRunning ? 'Running\u2026' : 'Run'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <CodeEditor value={code} onChange={handleCodeChange} />
        <OutputPanel output={output} isRunning={isRunning} hasError={hasError} />
      </div>
    </div>
  );

  const BottomNav = (
    <nav className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {hasPrev ? (
            <Link
              href={`/dashboard/course/${courseId}/${moduleId}/lesson/${position - 1}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors group"
            >
              <svg className="w-4 h-4 text-muted-foreground group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            {Array.from({ length: lessonCount }, (_, i) => (
              <Link
                key={i}
                href={`/dashboard/course/${courseId}/${moduleId}/lesson/${i + 1}`}
                className={`block rounded-full transition-all ${
                  i + 1 === position
                    ? 'bg-primary w-6 h-2'
                    : i + 1 < position
                    ? 'bg-primary/40 w-2 h-2 hover:bg-primary/60'
                    : 'bg-muted-foreground/30 w-2 h-2 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {hasNext ? (
            <Link
              href={`/dashboard/course/${courseId}/${moduleId}/lesson/${position + 1}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors group"
            >
              <span>Next</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <Link
              href={`/dashboard/course/${courseId}/${moduleId}/quiz`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors group"
            >
              <span>Take Quiz</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </header>

      {/* Mobile: tab bar */}
      <div className="md:hidden shrink-0 flex border-b border-border/50">
        <button
          onClick={() => setActiveTab('lesson')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'lesson'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Lesson
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'code'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Code
        </button>
      </div>

      {/* Mobile: single active pane */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {activeTab === 'lesson' ? ProsePane : CodePane}
      </div>

      {/* Desktop: split pane */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto border-r border-border/50">
          {ProsePane}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {CodePane}
        </div>
      </div>

      {BottomNav}
    </div>
  );
}
