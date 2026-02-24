# Judge0-Native Code Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the brittle assert-based test runner with a Judge0-native architecture: Run button shows raw stdout, Submit button packs all test cases into one Judge0 submission via a hidden Python test runner and auto-advances on full pass.

**Architecture:** Two separate actions — Run (1 submission, free-form stdin, shows stdout) and Submit (1 submission, hidden test runner appended to user code, parses JSON stdout for per-test results). All test cases for a lesson → exactly 1 Judge0 API call on Submit, keeping submissions at 1 per lesson attempt regardless of how many test cases exist. Test case data lives as `JSONB` on the `lessons` table with an `entry_point` column naming the function under test.

**Tech Stack:** Next.js 16 App Router, TypeScript, Judge0 CE via RapidAPI, Neon Postgres (raw SQL), React client components, Tailwind CSS v4.

---

## Background: Validated Architecture

This plan was validated with live curl calls against the real Judge0 API. Key findings:
- `POST /submissions?base64_encoded=false&wait=true` returns synchronously (status 3 = Accepted)
- Rate limit headers are: `x-ratelimit-submissions-remaining` / `x-ratelimit-submissions-reset` (current code reads wrong names — fix in Task 2)
- Python syntax errors → `status 11` (NZEC) + `stderr`, NOT `status 6` + `compile_output`. The `compile_output` field is always `null` for Python
- Test runner pattern validated: appending hidden runner to user code → 1 submission → JSON stdout with `[{d, pass, got, exp}, ...]`
- Batch submissions disabled on current plan (`x-ratelimit-batched-submissions-limit: 0`)

## Current File Map

```
app/src/lib/judge0.ts                        ← single submitCode() + wrong rate limit headers
app/src/lib/python-output.ts                 ← parsePythonError, formatOutput
app/src/lib/data.ts:157-208                  ← LessonData type + getLesson() — reads test_code column
app/src/app/api/code/run/route.ts            ← accepts {code, testCode}, concatenates, submits
app/src/app/api/code/save/route.ts           ← unchanged (auto-save)
app/src/app/api/code/usage/route.ts          ← unchanged (rate limit display)
app/src/components/lesson/code-lesson-layout.tsx  ← handleRun, CodePane, footer
app/src/components/lesson/output-panel.tsx   ← ExecutionPhase, fixed h-48 panel
app/src/context/rate-limit-context.tsx       ← increment() guard (unchanged)
app/migrations/seed-intro-python.mjs         ← seeds lessons with old test_code format
```

---

## Task 1: DB Migration — Add test_cases + entry_point Columns

**Files:**
- Create: `app/migrations/20260224-test-cases-columns.sql`

**Step 1: Write the migration SQL**

```sql
-- Migration: Add Judge0-native test cases support to lessons table
-- Date: 2026-02-24
--
-- test_cases: JSONB array of {description, args, expected}
-- entry_point: Python function name to call (e.g. "greet", "add")
-- test_code is kept (not dropped) to preserve existing seed data during transition

BEGIN;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS entry_point TEXT DEFAULT NULL;

COMMIT;
```

**Step 2: Run the migration**

In Neon Console → SQL Editor, paste and run the migration. Or:
```bash
# From project root: app/migrations/20260224-test-cases-columns.sql
# Paste into Neon Console SQL editor and execute
```

Expected: No errors, migration completes.

**Step 3: Verify columns exist**

In Neon Console:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;
```
Expected: `test_cases` (jsonb) and `entry_point` (text) rows are present.

**Step 4: Commit**

```bash
git add app/migrations/20260224-test-cases-columns.sql
git commit -m "feat: add test_cases + entry_point columns to lessons"
```

---

## Task 2: Fix Rate Limit Headers in judge0.ts

**Files:**
- Modify: `app/src/lib/judge0.ts:22-23`

**Step 1: Read the current wrong headers**

In `judge0.ts`, `parseRateLimitHeaders` (lines 22-23) reads:
```typescript
const remaining = headers.get('X-RateLimit-requests-Remaining');
const reset = headers.get('X-RateLimit-requests-Reset');
```

Curl dump confirmed the real header names are lowercase with "submissions":
```
x-ratelimit-submissions-remaining: 49
x-ratelimit-submissions-reset: 1740441600
```

**Step 2: Fix the header names**

In `app/src/lib/judge0.ts`, replace lines 22-23:
```typescript
// BEFORE:
const remaining = headers.get('X-RateLimit-requests-Remaining');
const reset = headers.get('X-RateLimit-requests-Reset');

// AFTER:
const remaining = headers.get('x-ratelimit-submissions-remaining');
const reset = headers.get('x-ratelimit-submissions-reset');
```

**Step 3: Verify**

```bash
cd app && npm run build 2>&1 | tail -5
```
Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add app/src/lib/judge0.ts
git commit -m "fix: correct rate limit header names for Judge0 RapidAPI"
```

---

## Task 3: Refactor judge0.ts — Split into runCode + submitCode

**Files:**
- Modify: `app/src/lib/judge0.ts` (full rewrite — keep `getUsage`, replace `submitCode`, add `runCode` + `buildTestRunner`)

**Step 1: Understand what changes**

Current `submitCode(sourceCode)`:
- Posts to Judge0, returns `{stdout, stderr, statusId, statusDescription, remaining, resetAt}`
- Used by `/api/code/run/route.ts`

New design:
- `runCode(sourceCode, stdin?)` → `Judge0RunResult` — for Run button, no test runner
- `buildTestRunner(userCode, testCases, entryPoint)` → `string` — generates Python test runner appended to user code
- `submitCode(userCode, testCases, entryPoint)` → `Judge0SubmitResult` — for Submit button, runs test runner, parses JSON

**Step 2: Write new judge0.ts**

Replace the entire content of `app/src/lib/judge0.ts`:

```typescript
const API_KEY = process.env.JUDGE0_API_KEY!;
const API_HOST = process.env.JUDGE0_API_HOST!;
const BASE_URL = `https://${API_HOST}`;

const PYTHON_LANGUAGE_ID = 71;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestCase {
  description: string;
  args: unknown[];
  expected: unknown;
}

export interface Judge0RunResult {
  stdout: string;
  stderr: string;
  statusId: number;
  statusDescription: string;
  time: number | null;    // seconds, e.g. 0.124
  memory: number | null;  // kilobytes
  remaining: number | null;
  resetAt: number | null;
}

export interface TestCaseResult {
  d: string;      // description
  pass: boolean;
  got: unknown;
  exp: unknown;
}

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

export interface UsageResult {
  remaining: number | null;
  resetAt: number | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function parseRateLimitHeaders(headers: Headers): { remaining: number | null; resetAt: number | null } {
  const remaining = headers.get('x-ratelimit-submissions-remaining');
  const reset = headers.get('x-ratelimit-submissions-reset');
  return {
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    resetAt: reset !== null ? parseInt(reset, 10) : null,
  };
}

async function postSubmission(
  sourceCode: string,
  stdin?: string,
): Promise<{ data: Record<string, unknown>; remaining: number | null; resetAt: number | null }> {
  const body: Record<string, unknown> = {
    source_code: sourceCode,
    language_id: PYTHON_LANGUAGE_ID,
  };
  if (stdin !== undefined) body.stdin = stdin;

  const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    },
    body: JSON.stringify(body),
  });

  const { remaining, resetAt } = parseRateLimitHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`Judge0 error: ${res.status}`);
  }

  const data = await res.json() as Record<string, unknown>;
  return { data, remaining, resetAt };
}

// ─── Test runner builder ─────────────────────────────────────────────────────

/**
 * Append a hidden Python test runner to user code.
 * Output: a single JSON array printed to stdout:
 *   [{"d": "description", "pass": true, "got": 3, "exp": 3}, ...]
 *
 * Uses underscore-prefixed private vars to avoid colliding with user code.
 */
export function buildTestRunner(
  userCode: string,
  testCases: TestCase[],
  entryPoint: string,
): string {
  const casesJson = JSON.stringify(
    testCases.map(tc => ({ d: tc.description, args: tc.args, expected: tc.expected }))
  );

  const runner = `

# ── auto-generated test runner ──────────────────────────────────────────────
import json as _json

_cases = ${casesJson}
_fn = ${entryPoint}
_results = []

for _tc in _cases:
    try:
        _got = _fn(*_tc["args"])
        _results.append({"d": _tc["d"], "pass": _got == _tc["expected"], "got": _got, "exp": _tc["expected"]})
    except Exception as _e:
        _results.append({"d": _tc["d"], "pass": False, "got": str(_e), "exp": _tc["expected"]})

print(_json.dumps(_results))
`;

  return `${userCode}\n${runner}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run user code freely (no test runner).
 * Used by the "Run" button — shows raw stdout.
 */
export async function runCode(sourceCode: string, stdin?: string): Promise<Judge0RunResult> {
  const { data, remaining, resetAt } = await postSubmission(sourceCode, stdin);

  return {
    stdout: (data.stdout as string) ?? '',
    stderr: (data.stderr as string) ?? '',
    statusId: (data.status as { id: number })?.id ?? 0,
    statusDescription: (data.status as { description: string })?.description ?? '',
    time: data.time !== null && data.time !== undefined ? parseFloat(data.time as string) : null,
    memory: data.memory !== null && data.memory !== undefined ? parseInt(data.memory as string, 10) : null,
    remaining,
    resetAt,
  };
}

/**
 * Submit user code against test cases.
 * Appends a hidden test runner, runs 1 Judge0 submission, parses JSON stdout.
 * Used by the "Submit" button.
 */
export async function submitCode(
  userCode: string,
  testCases: TestCase[],
  entryPoint: string,
): Promise<Judge0SubmitResult> {
  const source = buildTestRunner(userCode, testCases, entryPoint);
  const { data, remaining, resetAt } = await postSubmission(source);

  const statusId = (data.status as { id: number })?.id ?? 0;
  const statusDescription = (data.status as { description: string })?.description ?? '';
  const stderr = (data.stderr as string) ?? '';
  const time = data.time !== null && data.time !== undefined ? parseFloat(data.time as string) : null;
  const memory = data.memory !== null && data.memory !== undefined ? parseInt(data.memory as string, 10) : null;

  // Non-Accepted statuses: TLE (5), Runtime Error (11), etc.
  if (statusId !== 3) {
    return { tests: [], allPassed: false, statusId, statusDescription, stderr, time, memory, remaining, resetAt };
  }

  // Parse JSON stdout
  const stdout = ((data.stdout as string) ?? '').trim();
  let tests: TestCaseResult[] = [];
  try {
    tests = JSON.parse(stdout) as TestCaseResult[];
  } catch {
    // Runner output was not valid JSON — treat as runtime error
    return {
      tests: [],
      allPassed: false,
      statusId: 11,
      statusDescription: 'Runtime Error',
      stderr: `Could not parse test runner output: ${stdout}`,
      time,
      memory,
      remaining,
      resetAt,
    };
  }

  const allPassed = tests.length > 0 && tests.every(t => t.pass);
  return { tests, allPassed, statusId, statusDescription, stderr, time, memory, remaining, resetAt };
}

/**
 * Fetch current rate limit state (no code submission).
 */
export async function getUsage(): Promise<UsageResult> {
  const res = await fetch(`${BASE_URL}/config_info`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    },
  });

  const { remaining, resetAt } = parseRateLimitHeaders(res.headers);
  return { remaining, resetAt };
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "error TS|judge0"
```
Expected: No errors from judge0.ts.

**Step 4: Commit**

```bash
git add app/src/lib/judge0.ts
git commit -m "feat: refactor judge0.ts — split runCode/submitCode with test runner builder"
```

---

## Task 4: Update /api/code/run Route

**Files:**
- Modify: `app/src/app/api/code/run/route.ts` (full rewrite)

**Step 1: Understand the change**

Old: accepts `{code, testCode}`, concatenates, calls `submitCode`.
New: accepts `{code, stdin?}`, calls `runCode`, returns result including `time` and `memory`.

**Step 2: Write new route**

Replace the entire content of `app/src/app/api/code/run/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { runCode } from '@/lib/judge0';

export async function POST(req: Request) {
  const body = await req.json() as { code?: string; stdin?: string };
  const { code, stdin } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const result = await runCode(code, stdin);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "error TS|run/route"
```
Expected: No errors.

**Step 4: Commit**

```bash
git add app/src/app/api/code/run/route.ts
git commit -m "feat: update /api/code/run to use runCode with stdin support"
```

---

## Task 5: Create /api/code/submit Route

**Files:**
- Create: `app/src/app/api/code/submit/route.ts`

**Step 1: Write the route**

Create `app/src/app/api/code/submit/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { submitCode, TestCase } from '@/lib/judge0';

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
    const result = await submitCode(code, testCases, entryPoint);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Submission failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "error TS|submit/route"
```
Expected: No errors.

**Step 3: Commit**

```bash
git add app/src/app/api/code/submit/route.ts
git commit -m "feat: add /api/code/submit route for Judge0-native test runner"
```

---

## Task 6: Update data.ts — LessonData Type + getLesson Query

**Files:**
- Modify: `app/src/lib/data.ts:157-208`

**Step 1: Update LessonData interface (lines 157-167)**

The `LessonData` interface currently has `testCode: string | null`. Replace with `testCases` and `entryPoint`.

Find this block in `data.ts`:
```typescript
export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;
  title: string;
  codeTemplate: string | null;
  testCode: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
}
```

Replace with:
```typescript
import type { TestCase } from '@/lib/judge0';

export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;
  title: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
}
```

**Important:** The `import type { TestCase }` goes at the top of the file, with the other imports. Add it after the existing `import { cache } from 'react';` line.

**Step 2: Update getLesson SQL query and return mapping (lines 173-208)**

Find the SQL in `getLesson`:
```typescript
    const result = await sql`
      SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
             l.test_code, l.solution_code,
             m.id AS module_id, m.title AS module_title
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.module_id = ${moduleId}
        AND l.lesson_index = ${lessonIndex}
    `;
```

Replace with:
```typescript
    const result = await sql`
      SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
             l.test_cases, l.entry_point, l.solution_code,
             m.id AS module_id, m.title AS module_title
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.module_id = ${moduleId}
        AND l.lesson_index = ${lessonIndex}
    `;
```

Find the return object in `getLesson`:
```typescript
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      testCode: row.test_code ?? null,
      solutionCode: row.solution_code ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
    };
```

Replace with:
```typescript
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      testCases: (row.test_cases as TestCase[] | null) ?? null,
      entryPoint: row.entry_point ?? null,
      solutionCode: row.solution_code ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
    };
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "error TS|data\.ts"
```
Expected: Only errors about `testCode` prop being missing on `CodeLessonLayout` (those will be fixed in Task 8).

**Step 4: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: update LessonData type — testCases/entryPoint replace testCode"
```

---

## Task 7: Update OutputPanel — New Phases + Per-Test Results Display

**Files:**
- Modify: `app/src/components/lesson/output-panel.tsx` (full rewrite)

**Step 1: Understand what needs to change**

Current:
- `ExecutionPhase = 'idle' | 'running' | 'success' | 'error'`
- Props: `phase, output, error, hasTestCode`
- Shows: run output OR "All tests passed!" OR error message

New:
- `ExecutionPhase` gains: `'submitting' | 'submit-pass' | 'submit-fail' | 'tle'`
- Props: adds `submitResults?: TestCaseResult[] | null`, `metrics?: {time: number | null; memory: number | null} | null`
- Tab bar: "console" / "tests" (tests tab only shown when testCases exist)
- Console tab: run stdout
- Tests tab: per-test result list with ✓/✗ icons + got/exp values
- Metrics: "124ms · 12.4MB" in header after any submission

**Step 2: Write new output-panel.tsx**

Replace the entire content of `app/src/components/lesson/output-panel.tsx`:

```typescript
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

function HeaderLabel({ phase, hasTestCases }: { phase: ExecutionPhase; hasTestCases: boolean }) {
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
  if (phase === 'success') {
    return <span className="text-xs font-mono text-muted-foreground">Output</span>;
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

  // Auto-switch to tests tab on submit results
  const showTestsTab = hasTestCases;
  const isSubmitPhase = phase === 'submitting' || phase === 'submit-pass' || phase === 'submit-fail';
  const effectiveTab = isSubmitPhase && showTestsTab ? 'tests' : activeTab;

  const isIdle = phase === 'idle';
  const isLoading = phase === 'running' || phase === 'submitting';
  const isSuccess = phase === 'success';

  return (
    <div className="shrink-0 h-48 border-t border-border bg-muted/30 dark:bg-zinc-950 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <HeaderLabel phase={phase} hasTestCases={hasTestCases} />
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
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1 | grep -E "error TS|output-panel"
```
Expected: Errors only about callers passing the old `hasTestCode` prop (fixed in Task 8).

**Step 4: Commit**

```bash
git add app/src/components/lesson/output-panel.tsx
git commit -m "feat: redesign OutputPanel — Console/Tests tabs, per-test results, metrics badge"
```

---

## Task 8: Update CodeLessonLayout — New Props, handleSubmit, Submit Button

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx` (significant changes)

**Step 1: Understand what changes**

Props changing:
- Remove `testCode: string | null`
- Add `testCases: TestCase[] | null`
- Add `entryPoint: string | null`

State changes:
- Add `submitResults: TestCaseResult[] | null` state
- Add `metrics: ExecutionMetrics | null` state
- `testPassed` → now based on submit result

Logic changes:
- `handleRun`: no longer auto-advances. Just runs code, shows stdout. Phase stays `'success'` on Accepted, `'error'` on error.
- Add `handleSubmit`: calls `/api/code/submit`, handles all status codes, auto-advances on `allPassed`.
- Footer: remove "continue" button for test case lessons (auto-advance from submit handles this)

UI changes:
- Add Submit button to editor toolbar (next to Run)
- Pass new props to `OutputPanel`

**Step 2: Update the import and interface**

At top of `code-lesson-layout.tsx`, add imports:

```typescript
import type { TestCase, TestCaseResult } from '@/lib/judge0';
import type { ExecutionMetrics } from '@/components/lesson/output-panel';
```

Replace `CodeLessonLayoutProps` interface (replace `testCode: string | null` with two new props):

```typescript
interface CodeLessonLayoutProps {
  lessonTitle: string;
  content: string;
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
}
```

Update the destructured props in the function signature accordingly.

**Step 3: Update state + derived values**

In the component body, update `hasCode` and add new state:

```typescript
// Replace:
const hasCode = !!(testCode || codeTemplate);

// With:
const hasCode = !!(testCases || codeTemplate);
```

Add new state variables (after the existing `saveTimerRef`):

```typescript
const [submitResults, setSubmitResults] = useState<TestCaseResult[] | null>(null);
const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
```

**Step 4: Update handleRun — remove auto-advance and test logic**

Replace the entire `handleRun` function with:

```typescript
const handleRun = async () => {
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

    const result = await res.json();
    const { stdout, stderr, statusId, time, memory } = result;

    setMetrics({ time: time ?? null, memory: memory ?? null });

    if (statusId === 5) {
      setExecutionPhase('tle');
    } else if (stderr || (statusId !== 3 && statusId !== 0)) {
      const errorText = stderr || `Runtime error (status ${statusId})`;
      setParsedError(parsePythonError(errorText.trim()));
      setExecutionPhase('error');
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
```

**Step 5: Add handleSubmit**

Add this function after `handleRun`:

```typescript
const handleSubmit = async () => {
  if (!testCases || testCases.length === 0 || !entryPoint) return;

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

  setExecutionPhase('submitting');
  setOutput('');
  setParsedError(null);
  setSubmitResults(null);

  try {
    const res = await fetch('/api/code/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, testCases, entryPoint }),
    });

    if (!res.ok) {
      const msg = 'Submission service unavailable';
      setParsedError({ errorType: 'Error', message: msg, line: null, raw: msg });
      setExecutionPhase('error');
      return;
    }

    const result = await res.json();
    const { tests, allPassed, statusId, stderr, time, memory } = result;

    setMetrics({ time: time ?? null, memory: memory ?? null });

    if (statusId === 5) {
      setExecutionPhase('tle');
    } else if (statusId !== 3 || (tests.length === 0 && stderr)) {
      const errorText = stderr || `Runtime error (status ${statusId})`;
      setParsedError(parsePythonError(errorText.trim()));
      setExecutionPhase('error');
    } else {
      setSubmitResults(tests);
      setExecutionPhase(allPassed ? 'submit-pass' : 'submit-fail');

      if (allPassed) {
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
    }
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Network error';
    setParsedError({ errorType: 'Error', message, line: null, raw: message });
    setExecutionPhase('error');
  }
};
```

**Step 6: Update CodePane — add Submit button**

In the editor toolbar div (the one with the `run` button), add Submit button before `run`:

```tsx
{/* In the right-side buttons div: */}
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
</div>
```

Note: Run button is now outlined (secondary style), Submit is filled primary. Only shown when `testCases` exist.

**Step 7: Update OutputPanel usage in CodePane**

In the `CodePane` section where `OutputPanel` is rendered:

```tsx
// Replace:
<OutputPanel phase={executionPhase} output={output} error={parsedError} hasTestCode={!!testCode} />

// With:
<OutputPanel
  phase={executionPhase}
  output={output}
  error={parsedError}
  hasTestCases={!!(testCases && testCases.length > 0)}
  submitResults={submitResults}
  metrics={metrics}
/>
```

**Step 8: Update Footer — remove test-code continue button logic**

The footer currently has two conditions:
1. `{!hasCode && ...continue link}` — theory lessons, no change
2. `{hasCode && !testCode && ...continue link}` — code lessons without test code

Update condition 2 to use `testCases`:

```tsx
{/* Code lesson — manual continue (no test cases) */}
{hasCode && !testCases && (
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
```

**Step 9: Type-check**

```bash
cd app && npx tsc --noEmit 2>&1
```
Expected: Errors only about `testCode` in `lesson/[order]/page.tsx` (fixed in Task 9).

**Step 10: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: add Submit button + handleSubmit in CodeLessonLayout, wire new OutputPanel props"
```

---

## Task 9: Update Lesson Page — Pass New Props

**Files:**
- Modify: `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx:35-51`

**Step 1: Update CodeLessonLayout props in LessonPage**

The `page.tsx` currently passes `testCode={lessonData.testCode}`. Replace with new props.

Find:
```tsx
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      testCode={lessonData.testCode}
      solutionCode={lessonData.solutionCode}
```

Replace with:
```tsx
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      testCases={lessonData.testCases}
      entryPoint={lessonData.entryPoint}
      solutionCode={lessonData.solutionCode}
```

**Step 2: Type-check — should be clean**

```bash
cd app && npx tsc --noEmit 2>&1
```
Expected: No TypeScript errors.

**Step 3: Commit**

```bash
git add app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx
git commit -m "feat: pass testCases + entryPoint to CodeLessonLayout from lesson page"
```

---

## Task 10: Update Seed — Migrate Lessons to test_cases Format

**Files:**
- Modify: `app/migrations/seed-intro-python.mjs`

**Step 1: Understand what changes**

Existing lessons use `test_code` (string assert statements). New design requires:
- `test_cases` JSONB: array of `{description, args, expected}`
- `entry_point`: Python function name

Lesson 0: theory only — no change (no code)

Lesson 1 (`greet()`):
- Old `test_code`: `result = greet()\nassert result == "Hello, World!", ...`
- New: `test_cases = [{description: "returns Hello World", args: [], expected: "Hello, World!"}]`, `entry_point = "greet"`
- Template stays as `def greet():\n    # Return the string "Hello, World!"\n    pass\n`

Lesson 2 (f-string `greeting`):
- Old: variable assignment tested with assert
- New: Redesign as a function `make_greeting(name)` for clean function-call pattern
- New template: `def make_greeting(name):\n    # Return f"Hello, {name}!"\n    pass\n`
- New test_cases: `[{description: "greets a name", args: ["Python"], expected: "Hello, Python!"}, {description: "greets another name", args: ["Alice"], expected: "Hello, Alice!"}]`
- entry_point: `"make_greeting"`
- New solution: `def make_greeting(name):\n    return f"Hello, {name}!"\n`

**Step 2: Rewrite seed-intro-python.mjs**

Replace the relevant lesson-2 content and all INSERT statements:

```javascript
// Update lesson2Content — now uses a function
const lesson2Content = `## String Formatting with f-strings

Hardcoding \`"Hello, World!"\` is fine for a first program, but real programs greet *people*.

Python's **f-strings** let you embed variables directly in a string:

\`\`\`python
name = "Alice"
greeting = f"Hello, {name}!"
print(greeting)  # Hello, Alice!
\`\`\`

Prefix the string with \`f\` and wrap any variable in \`{}\` — Python substitutes its value at runtime.

### Task

Write a function \`make_greeting(name)\` that returns a greeting string using an f-string:

\`\`\`python
make_greeting("Alice")  # → "Hello, Alice!"
\`\`\`

Stuck? Use **Show Answer** to see the solution.
`;

const lesson2Template = `def make_greeting(name):
    # Return f"Hello, {name}!"
    pass
`;

const lesson2Solution = `def make_greeting(name):
    return f"Hello, {name}!"
`;
```

For the INSERT statements, update to use `test_cases` and `entry_point` columns. Replace all three lesson INSERTs with:

```javascript
// Lesson 0 — theory only, no code
await sql`
  INSERT INTO lessons (id, module_id, lesson_index, title, content,
                       code_template, test_code, solution_code,
                       test_cases, entry_point)
  VALUES (
    'lesson-intro-python-hello-world-00',
    'module-intro-python-hello-world-001',
    0,
    'What is Python?',
    ${lesson0Content},
    NULL, NULL, NULL, NULL, NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    code_template = EXCLUDED.code_template,
    test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
    test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
`;
console.log('✓ lesson 0 (theory — manual completion)');

// Lesson 1 — greet() function, Judge0 test cases
const lesson1TestCases = [
  { description: 'returns Hello World', args: [], expected: 'Hello, World!' }
];

await sql`
  INSERT INTO lessons (id, module_id, lesson_index, title, content,
                       code_template, test_code, solution_code,
                       test_cases, entry_point)
  VALUES (
    'lesson-intro-python-hello-world-01',
    'module-intro-python-hello-world-001',
    1,
    'Your First Python Function',
    ${lesson1Content},
    ${lesson1Template},
    NULL,
    NULL,
    ${JSON.stringify(lesson1TestCases)}::jsonb,
    'greet'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    code_template = EXCLUDED.code_template,
    test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
    test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
`;
console.log('✓ lesson 1 (greet — Judge0 test cases)');

// Lesson 2 — make_greeting(name) f-string function, Judge0 test cases
const lesson2TestCases = [
  { description: 'greets Python', args: ['Python'], expected: 'Hello, Python!' },
  { description: 'greets Alice', args: ['Alice'], expected: 'Hello, Alice!' },
];

await sql`
  INSERT INTO lessons (id, module_id, lesson_index, title, content,
                       code_template, test_code, solution_code,
                       test_cases, entry_point)
  VALUES (
    'lesson-intro-python-hello-world-02',
    'module-intro-python-hello-world-001',
    2,
    'String Formatting with f-strings',
    ${lesson2Content},
    ${lesson2Template},
    NULL,
    ${lesson2Solution},
    ${JSON.stringify(lesson2TestCases)}::jsonb,
    'make_greeting'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    code_template = EXCLUDED.code_template,
    test_code = EXCLUDED.test_code, solution_code = EXCLUDED.solution_code,
    test_cases = EXCLUDED.test_cases, entry_point = EXCLUDED.entry_point
`;
console.log('✓ lesson 2 (make_greeting — Judge0 test cases)');
```

**Step 3: Run the updated seed**

```bash
cd app && DATABASE_URL="<your-neon-connection-string>" node migrations/seed-intro-python.mjs
```
Expected output:
```
✓ course
✓ module
✓ lesson 0 (theory — manual completion)
✓ lesson 1 (greet — Judge0 test cases)
✓ lesson 2 (make_greeting — Judge0 test cases)

Done. Navigate to /dashboard to see the course.
```

**Step 4: Verify in DB**

```sql
SELECT id, entry_point, test_cases
FROM lessons
WHERE module_id = 'module-intro-python-hello-world-001'
ORDER BY lesson_index;
```
Expected: lesson-01 shows `entry_point = "greet"` and `test_cases` as JSON array. lesson-02 shows `entry_point = "make_greeting"`.

**Step 5: Commit**

```bash
git add app/migrations/seed-intro-python.mjs
git commit -m "feat: migrate seed lessons to Judge0 test_cases format (make_greeting function)"
```

---

## Task 11: End-to-End Verification

No test framework in this project — manual browser testing required.

**Step 1: Start dev server**

```bash
cd app && npm run dev
```

**Step 2: Verify Run button (lesson with test cases)**

1. Navigate to `/dashboard/course/course-intro-python-001/module-intro-python-hello-world-001/lesson/2`
2. The code pane should show `def greet():` template
3. Click **run** (outlined button) — should show raw output (empty, since `pass` returns None → prints nothing)
4. Type `return "Hello, World!"` — click **run** — output console shows nothing (function defined but not called on Run)
5. Expected: Console tab shows empty output, no error

**Step 3: Verify Submit button (all tests pass)**

1. Same lesson page
2. Enter correct code: `def greet():\n    return "Hello, World!"`
3. Click **submit** (filled primary button)
4. Panel switches to Tests tab — shows "testing···" spinner briefly
5. On response: Tests tab shows green ✓ for "returns Hello World"
6. Lesson auto-advances to next lesson after 700ms delay

**Step 4: Verify Submit button (test failure)**

1. Navigate back to lesson 2 (make_greeting)
2. Enter wrong code: `def make_greeting(name):\n    return "wrong"`
3. Click **submit**
4. Tests tab shows: ✗ "greets Python", ✗ "greets Alice" — both red
5. Click on a failing row → it expands showing `expected "Hello, Python!"` vs `got "wrong"`
6. No auto-advance

**Step 5: Verify error display (syntax error)**

1. Enter: `def greet(:\n    return "bad"`
2. Click **submit**
3. Tests tab shows Error phase with SyntaxError message
4. Console tab also available

**Step 6: Verify Run still works independently**

1. Enter: `def greet():\n    print("running!\n    return "ok"`
2. Click **run**
3. Console tab shows "running!" (the print output)
4. No auto-advance, Submit not triggered

**Step 7: Verify theory lesson unchanged**

1. Navigate to lesson 1 (What is Python? — theory, no code)
2. No code pane should be visible (or code tab not accessible)
3. Footer shows "continue" button — clicking navigates to lesson 2

**Step 8: Verify type check and build**

```bash
cd app && npx tsc --noEmit && npm run build 2>&1 | tail -10
```
Expected: No TypeScript errors, build succeeds.

---

## Summary of All Files Changed

| File | Change type |
|------|-------------|
| `app/migrations/20260224-test-cases-columns.sql` | New migration |
| `app/src/lib/judge0.ts` | Full rewrite — runCode, submitCode, buildTestRunner, fix headers |
| `app/src/app/api/code/run/route.ts` | Accepts `{code, stdin?}`, uses runCode |
| `app/src/app/api/code/submit/route.ts` | New route |
| `app/src/lib/data.ts` | LessonData type + getLesson SQL — testCases/entryPoint |
| `app/src/components/lesson/output-panel.tsx` | New phases, Console/Tests tabs, per-test results |
| `app/src/components/lesson/code-lesson-layout.tsx` | handleSubmit, Submit button, new props |
| `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx` | Pass testCases + entryPoint |
| `app/migrations/seed-intro-python.mjs` | Migrate lessons to test_cases format |

## ENV Vars Required

Ensure these exist in `.env.local`:
```
JUDGE0_API_KEY=<rapidapi-key>
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```
