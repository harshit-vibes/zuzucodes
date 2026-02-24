# Editor UX — Judge0-Native Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Run/Submit bifurcation with a single "Run" button that fires two parallel Judge0 calls (stdout + tests), ships templates as complete runnable programs, and hides the Tests tab until first Run.

**Architecture:** Six code tasks + one schema migration. Each task is independently committable. No tests exist in this repo — verification is `npx tsc --noEmit` plus manual browser check. Tasks are ordered by dependency: `judge0.ts` first (Tasks 1–2), then API routes (Tasks 3–4), then UI components (Tasks 5–6), then seed (Task 7), then schema (Task 8).

**Tech Stack:** Next.js 16 App Router, TypeScript, Judge0 CE (RapidAPI), Neon Postgres via `@neondatabase/serverless`

---

## Key invariants to preserve

- `isExecutingRef` guard — prevents concurrent runs
- `incrementRateLimit()` called once per Run action (local guard, not tied to Judge0 headers)
- Auto-save debounce (`/api/code/save`) — unchanged, not touched
- Progress marking (`/api/progress/lesson`) — fires on all-tests-pass, unchanged
- Auto-advance (`router.push(nextHref)`) — fires 700ms after all-tests-pass

---

## Task 1: Update `judge0.ts` — replace `buildTestRunner`/`submitCode` with `runTests`

**Files:**
- Modify: `app/src/lib/judge0.ts`

**What changes:**
- Remove: `buildTestRunner` (lines 100–134), `submitCode` (lines 162–203), `Judge0SubmitResult` interface (lines 33–43)
- Add: `Judge0TestsResult` interface and `runTests` function

**Step 1: Open `app/src/lib/judge0.ts` and delete the `Judge0SubmitResult` interface**

Remove these lines (33–43):
```typescript
export interface Judge0SubmitResult {
  tests: TestCaseResult[];
  allPassed: boolean;
  statusId: number;
  statusDescription: string;
  stderr: string;
  time: number | null;
  memory: number | null;
  remaining: number | null;
  resetAt: number | null;
}
```

Replace with the new interface:
```typescript
export interface Judge0TestsResult {
  tests: TestCaseResult[];
  allPassed: boolean;
  time: number | null;
  memory: number | null;
  remaining: number | null;
  resetAt: number | null;
}
```

**Step 2: Delete the entire `buildTestRunner` function (lines 91–134)**

Remove everything from `// ─── Test runner builder ─────` through the closing `}` of `buildTestRunner`.

**Step 3: Delete the entire `submitCode` function (lines 162–203)**

Remove everything from `/** * Submit user code...` through the closing `}` of `submitCode`.

**Step 4: Add `runTests` after `runCode` (before `getUsage`)**

Insert this after `runCode` ends (after line 155 in the original):

```typescript
/**
 * Run user code against test cases using one Judge0 call per test case (in parallel).
 * Each call executes: userCode + a one-liner that calls entryPoint(*args) and prints result.
 * Pass/fail is determined by comparing stdout to str(expected).
 */
export async function runTests(
  userCode: string,
  testCases: TestCase[],
  entryPoint: string,
): Promise<Judge0TestsResult> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryPoint)) {
    throw new Error(`Invalid entryPoint: ${entryPoint}`);
  }

  const runResults = await Promise.all(
    testCases.map((tc) => {
      const argsJson = JSON.stringify(tc.args);
      const program = [
        userCode,
        '',
        'import json as _json',
        `_args = _json.loads(${JSON.stringify(argsJson)})`,
        `print(${entryPoint}(*_args))`,
      ].join('\n');
      return runCode(program);
    })
  );

  const tests: TestCaseResult[] = testCases.map((tc, i) => {
    const r = runResults[i];
    if (r.statusId === 3) {
      const got = (r.stdout ?? '').trim();
      return { d: tc.description, pass: got === String(tc.expected), got, exp: tc.expected };
    }
    const got = (r.stderr ?? '').trim() || `Runtime error (status ${r.statusId})`;
    return { d: tc.description, pass: false, got, exp: tc.expected };
  });

  const allPassed = tests.every(t => t.pass);
  const last = runResults[runResults.length - 1];
  return {
    tests,
    allPassed,
    time: last?.time ?? null,
    memory: last?.memory ?? null,
    remaining: last?.remaining ?? null,
    resetAt: last?.resetAt ?? null,
  };
}
```

**Step 5: Type check**

Run: `cd app && npx tsc --noEmit`
Expected: Zero errors from `judge0.ts`. Other files may emit errors about `Judge0SubmitResult` — those are expected and will be fixed in later tasks.

**Step 6: Commit**

```bash
git add app/src/lib/judge0.ts
git commit -m "feat: replace buildTestRunner/submitCode with runTests in judge0.ts"
```

---

## Task 2: Create `/api/code/test` route

**Files:**
- Create: `app/src/app/api/code/test/route.ts`

**Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server';
import { runTests, TestCase } from '@/lib/judge0';

export async function POST(req: Request) {
  const body = await req.json() as { code?: string; testCases?: TestCase[]; entryPoint?: string };
  const { code, testCases, entryPoint } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return NextResponse.json({ error: 'Missing testCases' }, { status: 400 });
  }
  if (!entryPoint || typeof entryPoint !== 'string') {
    return NextResponse.json({ error: 'Missing entryPoint' }, { status: 400 });
  }

  try {
    const result = await runTests(code, testCases, entryPoint);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Test execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Type check**

Run: `cd app && npx tsc --noEmit`
Expected: Zero errors in new file.

**Step 3: Commit**

```bash
git add app/src/app/api/code/test/route.ts
git commit -m "feat: add /api/code/test route using runTests"
```

---

## Task 3: Delete `/api/code/submit` route

**Files:**
- Delete: `app/src/app/api/code/submit/route.ts`

**Step 1: Delete the file**

```bash
rm app/src/app/api/code/submit/route.ts
```

**Step 2: Verify it's gone**

```bash
ls app/src/app/api/code/
```
Expected: `run/` and `test/` and `save/` and `usage/` — no `submit/` directory.

**Step 3: Commit**

```bash
git add -A app/src/app/api/code/submit/
git commit -m "feat: delete /api/code/submit route (replaced by /api/code/test)"
```

---

## Task 4: Update `output-panel.tsx` — simplify phases + add `hasRun`

**Files:**
- Modify: `app/src/components/lesson/output-panel.tsx`

**What changes:**
- `ExecutionPhase`: remove `success`, `submitting`, `submit-pass`, `submit-fail` → add `run-pass`, `run-fail`
- Props: rename `submitResults` → `testResults`, replace `hasTestCases` logic with `hasRun: boolean` prop
- `HeaderLabel`: update for new phases, accept `allTestsPassed: boolean`
- Tab visibility: `showTestsTab = hasRun && hasTestCases` (Tests tab hidden until first Run)
- Auto-switch: trigger on `run-pass | run-fail` (not on `submitting`)
- Console content: replace `isSuccess` / `submit-*` phase refs

**Step 1: Replace the `ExecutionPhase` type (lines 7–15)**

Old:
```typescript
export type ExecutionPhase =
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'submitting'
  | 'submit-pass'
  | 'submit-fail'
  | 'tle';
```

New:
```typescript
export type ExecutionPhase =
  | 'idle'
  | 'running'
  | 'run-pass'
  | 'run-fail'
  | 'error'
  | 'tle';
```

**Step 2: Replace the `OutputPanelProps` interface (lines 22–29)**

Old:
```typescript
interface OutputPanelProps {
  phase: ExecutionPhase;
  output: string;
  error: ParsedError | null;
  hasTestCases: boolean;
  submitResults: TestCaseResult[] | null;
  metrics: ExecutionMetrics | null;
}
```

New:
```typescript
interface OutputPanelProps {
  phase: ExecutionPhase;
  output: string;
  error: ParsedError | null;
  hasTestCases: boolean;
  hasRun: boolean;
  testResults: TestCaseResult[] | null;
  metrics: ExecutionMetrics | null;
}
```

**Step 3: Replace `HeaderLabel` function (lines 43–71)**

Old signature: `function HeaderLabel({ phase }: { phase: ExecutionPhase })`

New (replace entire function):
```typescript
function HeaderLabel({ phase, allTestsPassed }: { phase: ExecutionPhase; allTestsPassed: boolean }) {
  if (phase === 'running') {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">Running…</span>
    );
  }
  if (phase === 'run-pass' && allTestsPassed) {
    return (
      <span className="text-xs text-green-500 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        All tests passed
      </span>
    );
  }
  if (phase === 'run-fail') {
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
```

**Step 4: Replace the `OutputPanel` function signature and top-of-function logic (lines 186–196)**

Old:
```typescript
export function OutputPanel({ phase, output, error, hasTestCases, submitResults, metrics }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'tests'>('console');

  // Auto-switch to tests tab on submit phases
  const showTestsTab = hasTestCases;
  const isSubmitPhase = phase === 'submitting' || phase === 'submit-pass' || phase === 'submit-fail' || phase === 'tle';
  const effectiveTab = isSubmitPhase && showTestsTab ? 'tests' : activeTab;

  const isIdle = phase === 'idle';
  const isLoading = phase === 'running' || phase === 'submitting';
  const isSuccess = phase === 'success';
```

New:
```typescript
export function OutputPanel({ phase, output, error, hasTestCases, hasRun, testResults, metrics }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'tests'>('console');

  // Tests tab visible only after first Run
  const showTestsTab = hasTestCases && hasRun;
  const hasResults = testResults !== null && testResults.length > 0;
  const allTestsPassed = hasResults && testResults!.every(t => t.pass);
  const autoSwitchToTests = (phase === 'run-pass' || phase === 'run-fail') && showTestsTab && hasResults;
  const effectiveTab = autoSwitchToTests ? 'tests' : activeTab;

  const isIdle = phase === 'idle';
  const isLoading = phase === 'running';
```

**Step 5: Update `<HeaderLabel ... />` call (line 203 in original)**

Old:
```tsx
<HeaderLabel phase={phase} />
```

New:
```tsx
<HeaderLabel phase={phase} allTestsPassed={allTestsPassed} />
```

**Step 6: Replace the entire Tests tab content block (lines 235–271)**

Old (everything between `{/* Tests tab */}` and its closing `}`):
```tsx
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
```

New:
```tsx
{/* Tests tab */}
{effectiveTab === 'tests' && showTestsTab && (
  <>
    {phase === 'running' && (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground/50 animate-pulse">…</span>
      </div>
    )}
    {(phase === 'run-pass' || phase === 'run-fail') && hasResults && (
      <TestResultsList results={testResults!} />
    )}
    {(phase === 'run-pass' || phase === 'run-fail') && !hasResults && (
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
  </>
)}
```

**Step 7: Replace the Console tab content block (lines 273–304)**

Old:
```tsx
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
```

New:
```tsx
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
    {(phase === 'run-pass' || phase === 'run-fail') && output && <OutputDisplay output={output} />}
    {(phase === 'run-pass' || phase === 'run-fail') && !output && (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground/40">(no output)</span>
      </div>
    )}
    {(isIdle || isLoading) && output && <OutputDisplay output={output} />}
  </>
)}
```

**Step 8: Type check**

Run: `cd app && npx tsc --noEmit`
Expected: Errors in `code-lesson-layout.tsx` (about old phase values and props) — expected, fixed in Task 5.

**Step 9: Commit**

```bash
git add app/src/components/lesson/output-panel.tsx
git commit -m "feat: simplify ExecutionPhase to run-pass/run-fail, add hasRun to OutputPanel"
```

---

## Task 5: Update `code-lesson-layout.tsx` — single Run button

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

**What changes:**
- Remove: `handleSubmit` function, Submit button, `submitResults` state
- Add: `hasRun` state, `testResults` state (renamed)
- Rewrite: `handleRun` to fire 2 parallel fetch calls
- Import: `Judge0TestsResult` from `@/lib/judge0`, remove `Judge0SubmitResult`
- Pass: `hasRun` + `testResults` to `OutputPanel`

**Step 1: Update the import line (line 14)**

Old:
```typescript
import type { TestCase, TestCaseResult, Judge0RunResult, Judge0SubmitResult } from '@/lib/judge0';
```

New:
```typescript
import type { TestCase, TestCaseResult, Judge0RunResult, Judge0TestsResult } from '@/lib/judge0';
```

**Step 2: Replace the two state lines for `submitResults` and add `hasRun` (around line 63–64)**

Old:
```typescript
  const [submitResults, setSubmitResults] = useState<TestCaseResult[] | null>(null);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
```

New:
```typescript
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
```

**Step 3: Replace the entire `handleRun` function (lines 104–162)**

Old:
```typescript
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
      setSubmitResults(null);
      setMetrics(null);

      try {
        const res = await fetch('/api/code/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const msg = 'Execution service unavailable';
          setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
          setExecutionPhase('error');
          return;
        }

        const result = await res.json() as Judge0RunResult;
        const { stdout, stderr, statusId, time, memory } = result;

        setMetrics({ time: time ?? null, memory: memory ?? null });

        if (statusId === 5) {
          setExecutionPhase('tle');
        } else if (stderr || (statusId !== 3 && statusId !== 0)) {
          const errorText = stderr || `Runtime error (status ${statusId})`;
          setParsedError(parsePythonError(errorText.trim()));
          setExecutionPhase('error');
        } else {
          setOutput((stdout ?? '').trim());
          setExecutionPhase('success');
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
```

New:
```typescript
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
        setHasRun(true);

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

        setOutput((stdout ?? '').trim());

        if (testRes && testRes.ok) {
          const testResult = await testRes.json() as Judge0TestsResult;
          setTestResults(testResult.tests);
          setExecutionPhase(testResult.allPassed ? 'run-pass' : 'run-fail');

          if (testResult.allPassed) {
            if (isAuthenticated && !isCompleted) {
              fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, courseId }),
              }).catch(() => {});
            }
            await new Promise(resolve => setTimeout(resolve, 700));
            router.push(nextHref);
          }
        } else {
          // No test cases or test service unavailable — just show console output
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
```

**Step 4: Delete the entire `handleSubmit` function (lines 164–236)**

Remove everything from `const handleSubmit = async () => {` through its closing `};`.

**Step 5: Update the run button `disabled` check and remove the submit button (lines 276–293 in CodePane)**

Old:
```tsx
          <button
            onClick={handleRun}
            disabled={executionPhase === 'running' || executionPhase === 'submitting'}
            className="flex items-center gap-1 px-2.5 h-6 rounded border border-border dark:border-zinc-600 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {executionPhase === 'running' ? 'running···' : 'run'}
          </button>
          {testCases && testCases.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={executionPhase === 'running' || executionPhase === 'submitting'}
              className="flex items-center gap-1 px-2.5 h-6 rounded bg-primary/90 hover:bg-primary text-primary-foreground text-[11px] font-mono disabled:opacity-50 transition-colors"
            >
              {executionPhase === 'submitting' ? 'testing···' : 'submit'}
            </button>
          )}
```

New (run button only, submit button deleted):
```tsx
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
```

**Step 6: Update `OutputPanel` props (lines 297–304)**

Old:
```tsx
        <OutputPanel
          phase={executionPhase}
          output={output}
          error={parsedError}
          hasTestCases={!!(testCases && testCases.length > 0)}
          submitResults={submitResults}
          metrics={metrics}
        />
```

New:
```tsx
        <OutputPanel
          phase={executionPhase}
          output={output}
          error={parsedError}
          hasTestCases={!!(testCases && testCases.length > 0)}
          hasRun={hasRun}
          testResults={testResults}
          metrics={metrics}
        />
```

**Step 7: Type check — must be zero errors**

Run: `cd app && npx tsc --noEmit`
Expected: Zero errors. Fix any residual issues before committing.

**Step 8: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: merge run+submit into single Run button with parallel Judge0 calls"
```

---

## Task 6: Update seed templates — add print calls

**Files:**
- Modify: `app/migrations/seed-intro-python.mjs`

**What changes:**
- `lesson1Template`: add `\nprint(greet())` at end
- `lesson2Template`: add `\nprint(make_greeting("Alice"))` at end
- `lesson1Content`: change "Click **Submit**" → "Click **Run**"

**Step 1: Update `lesson1Template` (line 67–70)**

Old:
```javascript
const lesson1Template = `def greet():
    # Return the string "Hello, World!"
    pass
`;
```

New:
```javascript
const lesson1Template = `def greet():
    # Return the string "Hello, World!"
    pass

print(greet())
`;
```

**Step 2: Update lesson1Content instruction (line 64)**

Old:
```javascript
Click **Submit** — if all tests pass, the lesson is automatically marked complete.
```

New:
```javascript
Click **Run** — if all tests pass, the lesson is automatically marked complete.
```

**Step 3: Update `lesson2Template` (lines 97–100)**

Old:
```javascript
const lesson2Template = `def make_greeting(name):
    # Return f"Hello, {name}!"
    pass
`;
```

New:
```javascript
const lesson2Template = `def make_greeting(name):
    # Return f"Hello, {name}!"
    pass

print(make_greeting("Alice"))
`;
```

**Step 4: Re-run the seed against your Neon DB**

```bash
cd app && node migrations/seed-intro-python.mjs
```
Expected:
```
✓ course
✓ module
✓ lesson 0 (theory — manual completion)
✓ lesson 1 (greet — Judge0 test cases)
✓ lesson 2 (make_greeting — Judge0 test cases)

Done. Navigate to /dashboard to see the course.
```

**Step 5: Commit**

```bash
git add app/migrations/seed-intro-python.mjs
git commit -m "feat: add print() example calls to lesson templates"
```

---

## Task 7: Schema migration — drop test_code, add GIN index + CHECK constraint

**Files:**
- Create: `app/migrations/2026-02-25-drop-test-code-gin-index.sql`

**Step 1: Create the migration file**

```sql
-- Drop dead column (no callers since test_cases migration)
ALTER TABLE lessons DROP COLUMN IF EXISTS test_code;

-- GIN index for JSONB queries on test_cases (rule 8.1)
-- Partial: only index rows that actually have test cases
CREATE INDEX IF NOT EXISTS idx_lessons_test_cases_gin
  ON lessons USING GIN (test_cases)
  WHERE test_cases IS NOT NULL;

-- Integrity constraint: if a lesson has test_cases it must also have entry_point
ALTER TABLE lessons
  ADD CONSTRAINT lessons_test_cases_entry_point_check
  CHECK (test_cases IS NULL OR entry_point IS NOT NULL);
```

**Step 2: Apply the migration**

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
const migration = fs.readFileSync('migrations/2026-02-25-drop-test-code-gin-index.sql', 'utf8');
sql.unsafe(migration).then(() => console.log('Migration applied')).catch(e => { console.error(e); process.exit(1); });
"
```

Or use the Neon console SQL editor to paste and run the file contents.

Expected: No errors, migration runs to completion.

**Step 3: Verify**

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT column_name FROM information_schema.columns WHERE table_name = 'lessons' ORDER BY ordinal_position\`.then(r => console.log(r.map(x => x.column_name)));
"
```
Expected: `test_code` is NOT in the list.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-25-drop-test-code-gin-index.sql
git commit -m "feat: drop test_code column, add GIN index on test_cases, add CHECK constraint"
```

---

## Final verification

**Step 1: Full type check (zero errors)**

```bash
cd app && npx tsc --noEmit
```

**Step 2: Start dev server**

```bash
cd app && npm run dev
```

**Step 3: Manual test checklist**

- [ ] Navigate to a lesson with code (e.g., lesson 1)
- [ ] Editor shows template with `print(greet())` at bottom
- [ ] Click **Run** → Console shows `None` (pass not implemented yet), Tests tab appears and shows 1 failing test
- [ ] Fix code: `return "Hello, World!"` → Click **Run** → Console shows `Hello, World!`, Tests shows ✓, auto-advance fires
- [ ] Navigate to lesson 2 — template has `print(make_greeting("Alice"))`
- [ ] Tests tab is **hidden** before first Run
- [ ] After Run, Tests tab appears
- [ ] Submit button is **gone** from toolbar
- [ ] Theory lesson (lesson 0): Run button present, no Tests tab appears after Run (hasTestCases = false)
