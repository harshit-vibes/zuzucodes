const BASE_URL = process.env.JUDGE0_BASE_URL!;
const AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN!;
const AUTH_HEADER = 'X-Auth-Token';

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
}

export interface Judge0TestsResult {
  tests: TestCaseResult[];
  allPassed: boolean;
  time: number | null;
  memory: number | null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function submitCode(sourceCode: string, stdin?: string): Promise<string> {
  const body: Record<string, unknown> = {
    source_code: sourceCode,
    language_id: PYTHON_LANGUAGE_ID,
  };
  if (stdin !== undefined) body.stdin = stdin;

  const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [AUTH_HEADER]: AUTH_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Judge0 submit error: ${res.status}`);

  const data = await res.json() as { token: string };
  return data.token;
}

async function pollResult(token: string): Promise<Record<string, unknown>> {
  const fields = 'stdout,stderr,status,time,memory';

  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(
      `${BASE_URL}/submissions/${token}?base64_encoded=false&fields=${fields}`,
      { headers: { [AUTH_HEADER]: AUTH_TOKEN } },
    );

    if (!res.ok) throw new Error(`Judge0 poll error: ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const status = data.status as { id: number; description: string };

    // status.id >= 3 means done (3=Accepted, 4=WA, 5=TLE, 6=CE, 7-14=errors)
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
export async function runCode(sourceCode: string, stdin?: string): Promise<Judge0RunResult> {
  const token = await submitCode(sourceCode, stdin);
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
 * Run user code against test cases — one Judge0 submission per test case, all in parallel.
 * Pass/fail: stdout.trim() === JSON.stringify(tc.expected)
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
      return submitCode(program);
    }),
  );

  // Poll all in parallel
  const settled = await Promise.allSettled(tokens.map(pollResult));

  const tests: TestCaseResult[] = testCases.map((tc, i) => {
    const result = settled[i];
    if (result.status === 'rejected') {
      return { d: tc.description, pass: false, got: (result.reason as Error)?.message ?? 'Request failed', exp: tc.expected };
    }
    const data = result.value;
    const status = data.status as { id: number };
    if (status.id === 3) {
      const got = ((data.stdout as string) ?? '').trim();
      return { d: tc.description, pass: got === JSON.stringify(tc.expected), got, exp: tc.expected };
    }
    const got = ((data.stderr as string) ?? '').trim() || `Runtime error (status ${status.id})`;
    return { d: tc.description, pass: false, got, exp: tc.expected };
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
