// app/scripts/create-course/executor-client.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const PYTHON_LANGUAGE_ID = 71;
const POLL_INTERVAL_MS  = 500;
const MAX_POLLS         = 60;

function loadEnv(): { url: string; apiKey: string } {
  const envPath = join(__dirname, '..', '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  if (!env['EXECUTOR_URL'])     throw new Error('EXECUTOR_URL not found in app/.env.local');
  if (!env['EXECUTOR_API_KEY']) throw new Error('EXECUTOR_API_KEY not found in app/.env.local');
  return { url: env['EXECUTOR_URL'], apiKey: env['EXECUTOR_API_KEY'] };
}

async function submitProgram(program: string, apiKey: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({ source_code: program, language_id: PYTHON_LANGUAGE_ID }),
  });
  if (!res.ok) throw new Error(`Executor submit error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { token: string };
  return data.token;
}

async function pollResult(token: string, apiKey: string, baseUrl: string): Promise<Record<string, unknown>> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${baseUrl}/submissions/${token}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) throw new Error(`Executor poll error: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const status = data.status as { id: number };
    if (status.id >= 3) return data;
    await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Execution timed out after 30s');
}

export interface VerifyTestCase {
  description: string;
  args: unknown[];
  expected: unknown;
}

export interface VerifyTestResult {
  description: string;
  pass: boolean;
  got: string;
  expected: unknown;
}

export interface VerifyResult {
  allPassed: boolean;
  tests: VerifyTestResult[];
}

/**
 * Verify that solution_code passes all test cases via the executor.
 * Mirrors runTests() in judge0.ts — same harness, same comparison.
 */
export async function verifyCodeChallenge(
  solutionCode: string,
  entryPoint: string,
  testCases: VerifyTestCase[],
): Promise<VerifyResult> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entryPoint)) {
    throw new Error(`Invalid entryPoint: ${entryPoint}`);
  }

  const { url, apiKey } = loadEnv();

  // Build harness program for each test case (same as judge0.ts lines 134-141)
  const programs = testCases.map(tc => {
    const argsJson = JSON.stringify(tc.args);
    return [
      solutionCode,
      '',
      'import json as _json',
      `_args = _json.loads(${JSON.stringify(argsJson)})`,
      `_result = ${entryPoint}(*_args)`,
      `print(_json.dumps(_result, separators=(',', ':')))`,
    ].join('\n');
  });

  // Submit all in parallel
  const tokens = await Promise.all(programs.map(p => submitProgram(p, apiKey, url)));

  // Poll all in parallel
  const settled = await Promise.allSettled(tokens.map(t => pollResult(t, apiKey, url)));

  const tests: VerifyTestResult[] = testCases.map((tc, i) => {
    const result = settled[i];
    if (result.status === 'rejected') {
      return { description: tc.description, pass: false, got: String(result.reason), expected: tc.expected };
    }
    const data = result.value;
    const status = data.status as { id: number };
    if (status.id === 3) {
      const got = ((data.stdout as string) ?? '').trim();
      const pass = got === JSON.stringify(tc.expected);
      return { description: tc.description, pass, got, expected: tc.expected };
    }
    const got = ((data.stderr as string) ?? '').trim() || `Runtime error (status ${status.id})`;
    return { description: tc.description, pass: false, got, expected: tc.expected };
  });

  return { allPassed: tests.every(t => t.pass), tests };
}
