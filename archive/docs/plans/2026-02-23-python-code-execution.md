# Python Code Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Python code editor to every lesson, with in-browser execution via Pyodide, auto-save, and a split-pane layout (tabs on mobile).

**Architecture:** The lesson page (Server Component) fetches lesson content + starter code + saved code, then renders a single `CodeLessonLayout` client component that owns the full page layout — split pane on desktop (prose left, editor + output right), tabs on mobile. Pyodide is lazy-loaded from CDN on first Run click and cached as a module-level singleton.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, `@uiw/react-codemirror` (CodeMirror 6), `@codemirror/lang-python`, Pyodide 0.27.0 (CDN), Neon Postgres.

**Design doc:** `docs/plans/2026-02-23-python-code-execution-design.md`

---

### Task 1: Install packages

**Files:**
- Modify: `app/package.json` (via npm install)

**Step 1: Install CodeMirror packages**

```bash
cd app && npm install @uiw/react-codemirror @codemirror/lang-python
```

**Step 2: Verify installation**

```bash
cd app && node -e "require('@uiw/react-codemirror'); require('@codemirror/lang-python'); console.log('OK')"
```

Expected: `OK`

**Step 3: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: install codemirror packages for Python editor"
```

---

### Task 2: Create `/api/code/save` route

**Files:**
- Create: `app/src/app/api/code/save/route.ts`

**Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return new NextResponse(null, { status: 204 }); // silently no-op for unauth
  }

  const { lessonId, code } = await req.json();

  if (!lessonId || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing lessonId or code' }, { status: 400 });
  }

  await sql`
    INSERT INTO user_code (user_id, lesson_id, code, updated_at)
    VALUES (${user.id}, ${lessonId}, ${code}, NOW())
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
  `;

  return new NextResponse(null, { status: 204 });
}
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/app/api/code/save/route.ts
git commit -m "feat: add /api/code/save route for user code persistence"
```

---

### Task 3: Create `OutputPanel` component

**Files:**
- Create: `app/src/components/output-panel.tsx`

**Step 1: Create the component**

```typescript
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
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/components/output-panel.tsx
git commit -m "feat: add OutputPanel component"
```

---

### Task 4: Create `CodeEditor` component

**Files:**
- Create: `app/src/components/code-editor.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const handleChange = useCallback(
    (val: string) => onChange(val),
    [onChange]
  );

  return (
    <div className="flex-1 overflow-hidden">
      <CodeMirror
        value={value}
        extensions={[python()]}
        theme="dark"
        onChange={handleChange}
        height="100%"
        style={{ height: '100%' }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          autocompletion: true,
          highlightActiveLine: true,
          tabSize: 4,
        }}
      />
    </div>
  );
}
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/components/code-editor.tsx
git commit -m "feat: add CodeEditor component using CodeMirror 6 + Python"
```

---

### Task 5: Create `CodeLessonLayout` component

This is the main client component. It owns the full page layout, Pyodide execution, auto-save debounce, and mobile/desktop switching.

**Files:**
- Create: `app/src/components/code-lesson-layout.tsx`

**Step 1: Create the component**

```typescript
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
    } catch (err: any) {
      setOutput(err?.message ?? String(err));
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
            {isRunning ? 'Running…' : 'Run'}
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
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors. If there are type errors from Pyodide's `window` usage or `setStdout`/`setStderr`, they are expected from the `any` cast and should not block compilation.

**Step 3: Commit**

```bash
git add app/src/components/code-lesson-layout.tsx
git commit -m "feat: add CodeLessonLayout with split pane, Pyodide runner, and auto-save"
```

---

### Task 6: Update lesson page

Replace the existing lesson page's prose-only rendering with `CodeLessonLayout`.

**Files:**
- Modify: `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx`

**Context:** The page currently imports `Markdown`, `LessonCompletion`, `Breadcrumb`, `Link` and renders prose + sticky header + sticky nav all inline. All of that moves into `CodeLessonLayout`. The page becomes a thin data-fetching shell.

**Step 1: Rewrite the page**

Replace the entire file with:

```typescript
import { getLesson, getModule, getLessonCount, isLessonCompleted, getUserCode } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { CodeLessonLayout } from '@/components/code-lesson-layout';

interface LessonPageProps {
  params: Promise<{ courseId: string; moduleId: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, moduleId, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [lessonData, module, lessonCount] = await Promise.all([
    getLesson(moduleId, position),
    getModule(moduleId),
    getLessonCount(moduleId),
  ]);

  if (!lessonData || !module) {
    notFound();
  }

  const [isCompleted, savedCode] = await Promise.all([
    user ? isLessonCompleted(user.id, lessonData.id) : Promise.resolve(false),
    user ? getUserCode(user.id, lessonData.id) : Promise.resolve(null),
  ]);

  return (
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      savedCode={savedCode}
      lessonId={lessonData.id}
      courseId={courseId}
      moduleId={moduleId}
      moduleTitle={module.title}
      position={position}
      lessonCount={lessonCount}
      isAuthenticated={!!user}
      isCompleted={isCompleted}
    />
  );
}
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx
git commit -m "feat: update lesson page to render CodeLessonLayout with Python editor"
```

---

### Task 7: Smoke test

**Step 1: Start dev server**

```bash
cd app && npm run dev -- -p 5050
```

**Step 2: Sign in and navigate to a lesson**

Open `http://localhost:5050/dashboard`. Sign in, open a course, navigate to any lesson.

**Verify:**
- [ ] Split pane visible on desktop (prose left, dark editor right)
- [ ] CodeMirror editor loads with Python syntax highlighting
- [ ] If lesson has `code_template`, it appears as initial code
- [ ] Type in editor — "Saved" appears ~1.5s after last keystroke
- [ ] Click **Run** — output panel shows "Running…" then result
- [ ] `print("hello")` → output shows `hello`
- [ ] `1/0` → output shows `ZeroDivisionError` in red
- [ ] Refresh page — saved code is restored from DB
- [ ] On mobile viewport (< 768px) — tabs appear instead of split pane
- [ ] Lesson tab shows prose; Code tab shows editor

**Step 3: Final type check**

```bash
cd app && npx tsc --noEmit 2>&1
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git commit --allow-empty -m "chore: smoke test Python code execution feature"
```
