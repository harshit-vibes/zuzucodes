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
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryPoint)) {
    throw new Error(`Invalid entryPoint: ${entryPoint}`);
  }

  const casesJson = JSON.stringify(
    testCases.map(tc => ({ d: tc.description, args: tc.args, expected: tc.expected }))
  );
  const casesJsonLiteral = JSON.stringify(casesJson);

  const runner = `

# ── auto-generated test runner ──────────────────────────────────────────────
import json as _json

_cases = _json.loads(${casesJsonLiteral})
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
