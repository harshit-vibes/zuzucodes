import { parsePythonError, ParsedError } from '@/lib/python-output';

const BASE_URL = process.env.EXECUTOR_URL!;
const API_KEY = process.env.EXECUTOR_API_KEY!;

const PYTHON_LANGUAGE_ID = 71;
const POLL_INTERVAL_MS = 500;
const MAX_POLLS = 60; // 30s timeout

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestCase {
  description: string;
  args: unknown[];
  expected: unknown;
  visible: boolean;
}

export interface Judge0RunResult {
  stdout: string;
  stderr: string;
  statusId: number;
  statusDescription: string;
  time: number | null;
  memory: number | null;
}

export interface TestCaseResult {
  d: string;
  pass: boolean;
  got: string;
  exp: unknown;
  kind: 'wrong-answer' | 'runtime-error';
  error?: ParsedError;
}

export interface Judge0TestsResult {
  tests: TestCaseResult[];
  allPassed: boolean;
  time: number | null;
  memory: number | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function submitCode(sourceCode: string, stdin?: string, userId?: string): Promise<string> {
  const body: Record<string, unknown> = {
    source_code: sourceCode,
    language_id: PYTHON_LANGUAGE_ID,
  };
  if (stdin !== undefined) body.stdin = stdin;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY,
  };
  if (userId) headers['X-User-Id'] = userId;

  const res = await fetch(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Executor submit error: ${res.status}`);

  const data = await res.json() as { token: string };
  return data.token;
}

async function pollResult(token: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${BASE_URL}/submissions/${token}`, {
      headers: { 'X-Api-Key': API_KEY },
    });

    if (!res.ok) throw new Error(`Executor poll error: ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const status = data.status as { id: number; description: string };

    // status.id >= 3 means done (3=Accepted, 5=TLE, 11=Runtime Error, 13=Internal Error)
    if (status.id >= 3) return data;

    await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Execution timed out after 30s');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run user code freely (no test runner).
 * Used by the "Run" button — shows raw stdout.
 */
export async function runCode(sourceCode: string, stdin?: string, userId?: string): Promise<Judge0RunResult> {
  const token = await submitCode(sourceCode, stdin, userId);
  const data = await pollResult(token);

  const status = data.status as { id: number; description: string };

  return {
    stdout: (data.stdout as string) ?? '',
    stderr: (data.stderr as string) ?? '',
    statusId: status.id,
    statusDescription: status.description,
    time: data.time !== null && data.time !== undefined ? parseFloat(data.time as string) : null,
    memory: data.memory !== null && data.memory !== undefined ? parseInt(data.memory as string, 10) : null,
  };
}

/**
 * Run user code against test cases — one submission per test case, all in parallel.
 * Pass/fail: stdout.trim() === JSON.stringify(tc.expected)
 */
export async function runTests(
  userCode: string,
  testCases: TestCase[],
  entryPoint: string,
  userId?: string,
): Promise<Judge0TestsResult> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryPoint)) {
    throw new Error(`Invalid entryPoint: ${entryPoint}`);
  }
  if (testCases.length === 0) {
    throw new Error('runTests requires at least one test case');
  }

  // Submit all in parallel, get tokens
  const tokens = await Promise.all(
    testCases.map((tc) => {
      const argsJson = JSON.stringify(tc.args);
      const program = [
        userCode,
        '',
        'import json as _json',
        `_args = _json.loads(${JSON.stringify(argsJson)})`,
        `_result = ${entryPoint}(*_args)`,
        `print(_json.dumps(_result, separators=(',', ':')))`,
      ].join('\n');
      return submitCode(program, undefined, userId);
    }),
  );

  // Poll all in parallel
  const settled = await Promise.allSettled(tokens.map(pollResult));

  const tests: TestCaseResult[] = testCases.map((tc, i) => {
    const result = settled[i];
    if (result.status === 'rejected') {
      const msg = (result.reason as Error)?.message ?? 'Request failed';
      return {
        d: tc.description,
        pass: false,
        got: msg,
        exp: tc.expected,
        kind: 'runtime-error',
        error: { errorType: 'NetworkError', message: msg, line: null, raw: msg },
      };
    }
    const data = result.value;
    const status = data.status as { id: number };
    if (status.id === 3) {
      const got = ((data.stdout as string) ?? '').trim();
      const pass = got === JSON.stringify(tc.expected);
      return { d: tc.description, pass, got, exp: tc.expected, kind: 'wrong-answer' };
    }
    const got = ((data.stderr as string) ?? '').trim() || `Runtime error (status ${status.id})`;
    const error = parsePythonError(got);
    return { d: tc.description, pass: false, got, exp: tc.expected, kind: 'runtime-error', error };
  });

  const allPassed = tests.every(t => t.pass);
  const lastFulfilled = settled.filter((s): s is PromiseFulfilledResult<Record<string, unknown>> => s.status === 'fulfilled').at(-1)?.value;

  return {
    tests,
    allPassed,
    time: lastFulfilled?.time !== null && lastFulfilled?.time !== undefined ? parseFloat(lastFulfilled.time as string) : null,
    memory: lastFulfilled?.memory !== null && lastFulfilled?.memory !== undefined ? parseInt(lastFulfilled.memory as string, 10) : null,
  };
}
