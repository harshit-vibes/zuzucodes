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

/**
 * Result for a single test case execution.
 * Note: `expected` should be a string or number primitive — comparison uses String(expected).
 */
export interface TestCaseResult {
  d: string;      // description
  pass: boolean;
  got: string;
  exp: unknown;
}

export interface Judge0TestsResult {
  tests: TestCaseResult[];
  allPassed: boolean;
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
 * Run user code against test cases — one Judge0 call per test case, in parallel.
 * Each call builds a small program: userCode + one-liner that calls entryPoint(*args) and prints the result.
 * Pass/fail is determined by comparing stdout.trim() to String(expected).
 */
export async function runTests(
  userCode: string,
  testCases: TestCase[],
  entryPoint: string,
): Promise<Judge0TestsResult> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryPoint)) {
    throw new Error(`Invalid entryPoint: ${entryPoint}`);
  }

  if (testCases.length === 0) {
    throw new Error('runTests requires at least one test case');
  }

  const settled = await Promise.allSettled(
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
    const result = settled[i];
    if (result.status === 'rejected') {
      const got = (result.reason as Error)?.message ?? 'Request failed';
      return { d: tc.description, pass: false, got, exp: tc.expected };
    }
    const r = result.value;
    if (r.statusId === 3) {
      const got = (r.stdout ?? '').trim();
      return { d: tc.description, pass: got === String(tc.expected), got, exp: tc.expected };
    }
    const got = (r.stderr ?? '').trim() || `Runtime error (status ${r.statusId})`;
    return { d: tc.description, pass: false, got, exp: tc.expected };
  });

  const allPassed = tests.every(t => t.pass);
  const lastFulfilled = settled.filter((s): s is PromiseFulfilledResult<Judge0RunResult> => s.status === 'fulfilled').at(-1)?.value;
  return {
    tests,
    allPassed,
    time: lastFulfilled?.time ?? null,
    memory: lastFulfilled?.memory ?? null,
    remaining: lastFulfilled?.remaining ?? null,
    resetAt: lastFulfilled?.resetAt ?? null,
  };
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
