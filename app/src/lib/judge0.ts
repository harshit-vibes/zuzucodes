const API_KEY = process.env.JUDGE0_API_KEY!;
const API_HOST = process.env.JUDGE0_API_HOST!;
const BASE_URL = `https://${API_HOST}`;

const PYTHON_LANGUAGE_ID = 71;

export interface Judge0Result {
  stdout: string;
  stderr: string;
  statusId: number;
  statusDescription: string;
  remaining: number | null;
  resetAt: number | null; // Unix timestamp (seconds)
}

export interface UsageResult {
  remaining: number | null;
  resetAt: number | null;
}

function parseRateLimitHeaders(headers: Headers): { remaining: number | null; resetAt: number | null } {
  const remaining = headers.get('x-ratelimit-submissions-remaining');
  const reset = headers.get('x-ratelimit-submissions-reset');
  return {
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    resetAt: reset !== null ? parseInt(reset, 10) : null,
  };
}

export async function submitCode(sourceCode: string): Promise<Judge0Result> {
  const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': API_HOST,
    },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: PYTHON_LANGUAGE_ID,
    }),
  });

  const { remaining, resetAt } = parseRateLimitHeaders(res.headers);

  if (!res.ok) {
    throw new Error(`Judge0 error: ${res.status}`);
  }

  const data = await res.json();

  return {
    stdout: data.stdout ?? '',
    stderr: data.stderr ?? data.compile_output ?? '',
    statusId: data.status?.id ?? 0,
    statusDescription: data.status?.description ?? '',
    remaining,
    resetAt,
  };
}

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
