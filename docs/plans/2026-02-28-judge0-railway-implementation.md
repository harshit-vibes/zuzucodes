# Judge0 CE on Railway — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Self-host Judge0 CE on Railway, replacing RapidAPI with async polling + per-user server-side rate limiting (per-min / per-3hr / per-day) tracked in Neon.

**Architecture:** Four Railway services (judge0-server, judge0-worker, Postgres, Redis) communicate over private networking. Next.js calls judge0-server via public Railway URL with `X-Auth-Token` header. Rate limits enforced in a new `code_runs` Neon table checked on every `/api/code/run` and `/api/code/test` call.

**Tech Stack:** Railway CLI (`railway`), `judge0/judge0:latest` Docker image, Next.js API routes, `@neondatabase/serverless` (already in use via `@/lib/neon`), Neon Postgres.

**Design doc:** `docs/plans/2026-02-28-judge0-railway-design.md`

---

## Task 1: Create the judge0-worker Dockerfile

The worker service needs a custom start command (`./scripts/workers`) that can't be set via `railway add --image`. We solve this with a one-line Dockerfile.

**Files:**
- Create: `infrastructure/judge0-worker/Dockerfile`

**Step 1: Create the directory and Dockerfile**

```bash
mkdir -p infrastructure/judge0-worker
```

Create `infrastructure/judge0-worker/Dockerfile`:

```dockerfile
FROM judge0/judge0:latest
CMD ["bash", "-c", "./scripts/workers"]
```

**Step 2: Verify**

```bash
cat infrastructure/judge0-worker/Dockerfile
```

Expected output:
```
FROM judge0/judge0:latest
CMD ["bash", "-c", "./scripts/workers"]
```

**Step 3: Commit**

```bash
git add infrastructure/judge0-worker/Dockerfile
git commit -m "feat: add judge0-worker Dockerfile for Railway deployment"
```

---

## Task 2: Create the Neon migration for code_runs

**Files:**
- Create: `app/migrations/2026-02-28-code-runs.sql`

**Step 1: Create the migration file**

```sql
-- Rate limiting: track code execution per user
-- Used by /api/code/run and /api/code/test to enforce per-min/per-3hr/per-day limits

CREATE TABLE code_runs (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_runs_user_executed ON code_runs (user_id, executed_at DESC);
```

**Step 2: Run the migration against Neon**

```bash
# From the app/ directory, with DATABASE_URL set in app/.env.local
cd app
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql\`
  CREATE TABLE IF NOT EXISTS code_runs (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
\`.then(() => sql\`
  CREATE INDEX IF NOT EXISTS idx_code_runs_user_executed ON code_runs (user_id, executed_at DESC)
\`).then(() => { console.log('Migration complete'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

Expected: `Migration complete`

**Step 3: Commit**

```bash
cd ..
git add app/migrations/2026-02-28-code-runs.sql
git commit -m "feat: add code_runs migration for server-side rate limiting"
```

---

## Task 3: Create rate-limit.ts helper

Shared logic for all three API routes: check limits, record runs, query usage.

**Files:**
- Create: `app/src/lib/rate-limit.ts`

**Step 1: Create the file**

```typescript
import { sql } from '@/lib/neon';

// ─── Limits ──────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  perMin: 10,
  per3hr: 100,
  perDay: 300,
} as const;

// ─── Error ───────────────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(
    public readonly window: 'perMin' | 'per3hr' | 'perDay',
    public readonly resetAt: Date,
  ) {
    super(`Rate limit exceeded: ${window}`);
    this.name = 'RateLimitError';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserUsage {
  perMin: number;
  per3hr: number;
  perDay: number;
  limits: typeof RATE_LIMITS;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function queryCounts(userId: string): Promise<{ perMin: number; per3hr: number; perDay: number }> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '1 minute')  AS per_min,
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '3 hours')   AS per_3hr,
      COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '24 hours')  AS per_day
    FROM code_runs
    WHERE user_id = ${userId}
      AND executed_at > NOW() - INTERVAL '24 hours'
  `;
  const row = rows[0] as Record<string, string>;
  return {
    perMin: parseInt(row.per_min, 10),
    per3hr: parseInt(row.per_3hr, 10),
    perDay: parseInt(row.per_day, 10),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Throws RateLimitError if any window is exceeded.
 * Call this BEFORE forwarding to Judge0.
 */
export async function checkRateLimit(userId: string): Promise<void> {
  const { perMin, per3hr, perDay } = await queryCounts(userId);

  if (perMin >= RATE_LIMITS.perMin) {
    throw new RateLimitError('perMin', new Date(Date.now() + 60_000));
  }
  if (per3hr >= RATE_LIMITS.per3hr) {
    throw new RateLimitError('per3hr', new Date(Date.now() + 3 * 60 * 60 * 1000));
  }
  if (perDay >= RATE_LIMITS.perDay) {
    const resetAt = new Date();
    resetAt.setUTCHours(24, 0, 0, 0);
    throw new RateLimitError('perDay', resetAt);
  }
}

/**
 * Insert a run record. Call this AFTER a successful Judge0 response.
 */
export async function recordRun(userId: string): Promise<void> {
  await sql`INSERT INTO code_runs (user_id) VALUES (${userId})`;
}

/**
 * Return current usage counts + limits for the usage API.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const counts = await queryCounts(userId);
  return { ...counts, limits: RATE_LIMITS };
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
cd ..
git add app/src/lib/rate-limit.ts
git commit -m "feat: add rate-limit helper with per-min/per-3hr/per-day windows"
```

---

## Task 4: Rewrite judge0.ts — async polling + new auth

Remove all RapidAPI specifics. Switch from `?wait=true` to async token polling.

**Files:**
- Modify: `app/src/lib/judge0.ts`

**Step 1: Replace the entire file**

```typescript
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
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors. If there are errors referencing removed fields (`remaining`, `resetAt`) from `Judge0RunResult`, those come from `RateLimitContext` — fix them in Task 8.

**Step 3: Commit**

```bash
cd ..
git add app/src/lib/judge0.ts
git commit -m "feat: rewrite judge0.ts — async polling, remove RapidAPI headers"
```

---

## Task 5: Update /api/code/run route

Add auth check and rate limit enforcement.

**Files:**
- Modify: `app/src/app/api/code/run/route.ts`

**Step 1: Replace the file**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runCode } from '@/lib/judge0';
import { checkRateLimit, recordRun, RateLimitError } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { code?: string; stdin?: string };
  const { code, stdin } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    await checkRateLimit(session.user.id);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message, window: err.window, resetAt: err.resetAt.getTime() },
        { status: 429 },
      );
    }
    throw err;
  }

  try {
    const result = await runCode(code, stdin);
    await recordRun(session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd ..
git add app/src/app/api/code/run/route.ts
git commit -m "feat: add auth + rate limiting to /api/code/run"
```

---

## Task 6: Update /api/code/test route

Same pattern as run — auth check + rate limit.

**Files:**
- Modify: `app/src/app/api/code/test/route.ts`

**Step 1: Replace the file**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runTests, TestCase } from '@/lib/judge0';
import { checkRateLimit, recordRun, RateLimitError } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    await checkRateLimit(session.user.id);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message, window: err.window, resetAt: err.resetAt.getTime() },
        { status: 429 },
      );
    }
    throw err;
  }

  try {
    const result = await runTests(code, testCases, entryPoint);
    await recordRun(session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Test execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd ..
git add app/src/app/api/code/test/route.ts
git commit -m "feat: add auth + rate limiting to /api/code/test"
```

---

## Task 7: Update /api/code/usage route

Replace the Judge0 `config_info` call with a Neon query via `getUserUsage`.

**Files:**
- Modify: `app/src/app/api/code/usage/route.ts`

**Step 1: Replace the file**

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getUserUsage } from '@/lib/rate-limit';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getUserUsage(session.user.id);
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ perMin: null, per3hr: null, perDay: null, limits: null }, { status: 502 });
  }
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
cd ..
git add app/src/app/api/code/usage/route.ts
git commit -m "feat: update /api/code/usage to query Neon instead of Judge0 config_info"
```

---

## Task 8: Update RateLimitContext

Remove localStorage tracking. Fetch real counts from `/api/code/usage`. Keep the same context shape so consumers don't break.

**Files:**
- Modify: `app/src/context/rate-limit-context.tsx`

**Step 1: Replace the file**

```typescript
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { RATE_LIMITS } from '@/lib/rate-limit';

// ─── State ───────────────────────────────────────────────────────────────────

export interface RateLimitState {
  // "remaining" reflects the most constrained window (min of all three)
  remaining: number | null;
  resetAt: number | null;
  isSyncing: boolean;
  lastSynced: Date | null;
}

const RateLimitStateContext = createContext<RateLimitState | null>(null);

// ─── Actions ─────────────────────────────────────────────────────────────────

interface RateLimitActions {
  refresh: () => Promise<void>;
}

const RateLimitActionsContext = createContext<RateLimitActions | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RateLimitState>({
    remaining: null,
    resetAt: null,
    lastSynced: null,
    isSyncing: false,
  });

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    try {
      const res = await fetch('/api/code/usage');
      if (!res.ok) throw new Error('Usage fetch failed');

      const data = await res.json() as {
        perMin: number;
        per3hr: number;
        perDay: number;
        limits: typeof RATE_LIMITS;
      };

      // Most constrained window determines "remaining"
      const remainingMin = data.limits.perMin - data.perMin;
      const remaining3hr = data.limits.per3hr - data.per3hr;
      const remainingDay = data.limits.perDay - data.perDay;
      const remaining = Math.max(0, Math.min(remainingMin, remaining3hr, remainingDay));

      // resetAt: next midnight UTC (day window)
      const resetAt = new Date();
      resetAt.setUTCHours(24, 0, 0, 0);

      setState({
        remaining,
        resetAt: Math.floor(resetAt.getTime() / 1000),
        lastSynced: new Date(),
        isSyncing: false,
      });
    } catch {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RateLimitActionsContext.Provider value={{ refresh }}>
      <RateLimitStateContext.Provider value={state}>
        {children}
      </RateLimitStateContext.Provider>
    </RateLimitActionsContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useRateLimitActions(): RateLimitActions {
  const ctx = useContext(RateLimitActionsContext);
  if (!ctx) throw new Error('useRateLimitActions must be used within RateLimitProvider');
  return ctx;
}

export function useRateLimitState(): RateLimitState {
  const ctx = useContext(RateLimitStateContext);
  if (!ctx) throw new Error('useRateLimitState must be used within RateLimitProvider');
  return ctx;
}

export function useRateLimit() {
  return { ...useRateLimitActions(), ...useRateLimitState() };
}
```

**Step 2: Find all usages of `increment` from the old context and update them**

```bash
cd app && grep -r "increment" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found: remove the `increment()` call and replace with `refresh()` call after the run/test response is received. Typically this is in the lesson player (`src/components/lesson/code-lesson-layout.tsx`).

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Fix any remaining type errors. Common ones:
- `remaining` used as a field on `Judge0RunResult` — these no longer exist; remove those usages
- `resetAt` from Judge0 result — same, remove

**Step 4: Commit**

```bash
cd ..
git add app/src/context/rate-limit-context.tsx
git add app/src/components/  # any updated consumers
git commit -m "feat: update RateLimitContext to use server-side counts from Neon"
```

---

## Task 9: Update env vars and docs

**Files:**
- Modify: `app/.env.local`
- Modify: `CLAUDE.md` (root)

**Step 1: Update app/.env.local**

Remove:
```
JUDGE0_API_KEY=...
JUDGE0_API_HOST=...
```

Add (values filled in after Task 10):
```
JUDGE0_BASE_URL=https://your-judge0-server.up.railway.app
JUDGE0_AUTH_TOKEN=your-secret-token
```

**Step 2: Update CLAUDE.md**

In the "Required Env Vars" section, replace:
```
JUDGE0_API_KEY            # RapidAPI key
JUDGE0_API_HOST           # e.g. judge0-ce.p.rapidapi.com
```

With:
```
JUDGE0_BASE_URL           # Railway Judge0 server URL, e.g. https://judge0-server-xxxx.up.railway.app
JUDGE0_AUTH_TOKEN         # Matches AUTHN_TOKEN set in Railway (keep secret)
```

**Step 3: Commit CLAUDE.md only** (never commit .env.local)

```bash
git add CLAUDE.md
git commit -m "docs: update env var docs for self-hosted Judge0"
```

---

## Task 10: Deploy Judge0 CE to Railway via CLI

All code changes are done. Now set up the Railway infra.

**Files:**
- No code changes — pure CLI operations

**Step 1: Install Railway CLI (if not already installed)**

```bash
railway --version
# If missing:
npm install -g @railway/cli
```

**Step 2: Login**

```bash
railway login
# Opens browser for OAuth
```

**Step 3: Create a new Railway project for Judge0**

```bash
railway init --name zuzu-judge0
```

**Step 4: Add Postgres and Redis**

```bash
railway add --database postgres
# Note the service name shown (usually "Postgres")

railway add --image bitnami/redis:7.2.5
# Note the service name shown (usually "Redis" or "bitnami-redis-7.2.5")
```

Wait ~30 seconds for both to provision. Check status:

```bash
railway status
```

**Step 5: Add judge0-server service**

```bash
railway add --image judge0/judge0:latest
# Note the service name — likely "judge0-judge0-latest" or rename it
```

**Step 6: Set env vars for judge0-server**

Replace `<Postgres-service-name>` and `<Redis-service-name>` with the actual names shown in `railway status`. Generate strong random values for `AUTHN_TOKEN` and `SECRET_KEY_BASE` (use `openssl rand -hex 32`).

```bash
# Generate secrets first
AUTHN_TOKEN=$(openssl rand -hex 32)
SECRET_KEY_BASE=$(openssl rand -hex 64)
echo "AUTHN_TOKEN: $AUTHN_TOKEN"
echo "SECRET_KEY_BASE: $SECRET_KEY_BASE"

railway variable set --service judge0-judge0-latest \
  POSTGRES_HOST='${{Postgres.RAILWAY_PRIVATE_DOMAIN}}' \
  POSTGRES_PORT=5432 \
  POSTGRES_DB=judge0 \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD='${{Postgres.POSTGRES_PASSWORD}}' \
  REDIS_HOST='${{Redis.RAILWAY_PRIVATE_DOMAIN}}' \
  REDIS_PORT=6379 \
  REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}' \
  AUTHN_HEADER='X-Auth-Token' \
  AUTHN_TOKEN="$AUTHN_TOKEN" \
  SECRET_KEY_BASE="$SECRET_KEY_BASE" \
  PORT=2358 \
  MAX_FILE_SIZE=1024 \
  MAX_MAX_FILE_SIZE=4096 \
  MAX_NUMBER_OF_RUNS=20 \
  NUMBER_OF_RUNS=1
```

**Step 7: Generate public domain for judge0-server**

```bash
railway domain --service judge0-judge0-latest
# Output: https://judge0-judge0-latest-xxxx.up.railway.app
```

Save this URL — it becomes `JUDGE0_BASE_URL`.

**Step 8: Add and deploy judge0-worker from local Dockerfile**

```bash
cd infrastructure/judge0-worker
railway add          # creates a new service, select "Empty Service"
# Link to this directory
railway link         # link to zuzu-judge0 project, select the new service
```

Set the same env vars for the worker:

```bash
railway variable set \
  POSTGRES_HOST='${{Postgres.RAILWAY_PRIVATE_DOMAIN}}' \
  POSTGRES_PORT=5432 \
  POSTGRES_DB=judge0 \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD='${{Postgres.POSTGRES_PASSWORD}}' \
  REDIS_HOST='${{Redis.RAILWAY_PRIVATE_DOMAIN}}' \
  REDIS_PORT=6379 \
  REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}' \
  SECRET_KEY_BASE="$SECRET_KEY_BASE"

railway up
```

Expected: worker container builds and starts.

**Step 9: Smoke test Judge0**

```bash
export JUDGE0_URL="https://your-judge0-server.up.railway.app"
export AUTHN_TOKEN="your-token"

# Test auth — should return 401 without token
curl -s -o /dev/null -w "%{http_code}" "$JUDGE0_URL/submissions"
# Expected: 401

# Test submission
curl -s -X POST "$JUDGE0_URL/submissions?base64_encoded=false" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: $AUTHN_TOKEN" \
  -d '{"source_code":"print(\"hello\")", "language_id": 71}'
# Expected: {"token":"<uuid>"}

# Poll the result (replace TOKEN with the token from above)
TOKEN="<token-from-above>"
curl -s "$JUDGE0_URL/submissions/$TOKEN?fields=stdout,stderr,status" \
  -H "X-Auth-Token: $AUTHN_TOKEN"
# Expected: {"stdout":"hello\n","stderr":null,"status":{"id":3,"description":"Accepted"}}
```

**Step 10: Update app/.env.local with real values**

```
JUDGE0_BASE_URL=https://your-judge0-server.up.railway.app
JUDGE0_AUTH_TOKEN=<your-authn-token>
```

**Step 11: Start dev server and test end-to-end**

```bash
cd app && npm run dev
```

Open a lesson in the browser, write code, click Run. Verify:
- Code executes and output appears
- Test cases pass/fail correctly
- Clicking Run multiple times shows rate limit decrementing in the UI
- After 10 runs in one minute, a 429 error is shown

**Step 12: Final type-check and lint**

```bash
cd app && npx tsc --noEmit && npm run lint
```

---

## Summary of Env Var Changes

| Removed | Added |
|---------|-------|
| `JUDGE0_API_KEY` | `JUDGE0_BASE_URL` |
| `JUDGE0_API_HOST` | `JUDGE0_AUTH_TOKEN` |

## Summary of File Changes

| File | Action |
|------|--------|
| `infrastructure/judge0-worker/Dockerfile` | New |
| `app/migrations/2026-02-28-code-runs.sql` | New |
| `app/src/lib/rate-limit.ts` | New |
| `app/src/lib/judge0.ts` | Rewrite |
| `app/src/app/api/code/run/route.ts` | Update |
| `app/src/app/api/code/test/route.ts` | Update |
| `app/src/app/api/code/usage/route.ts` | Update |
| `app/src/context/rate-limit-context.tsx` | Update |
| `CLAUDE.md` | Update env var docs |
