# Judge0 CE on Railway — Design Doc

**Date**: 2026-02-28
**Status**: Approved
**Motivation**: Remove RapidAPI rate limits (50/day) and unpredictable billing by self-hosting Judge0 CE on Railway.

---

## 1. Railway Service Architecture

Four services deployed in a dedicated Railway project (`zuzu-judge0`):

| Service | Image | Role | Public URL |
|---------|-------|------|------------|
| `judge0-server` | `judge0/judge0:latest` | HTTP API, port 2358 | Yes (Railway domain) |
| `judge0-worker` | custom Dockerfile | Sandboxed execution | No |
| `postgres` | Railway-managed Postgres | Submission storage | No (private) |
| `redis` | `bitnami/redis:7.2.5` | Job queue | No (private) |

The worker uses a custom `Dockerfile` (in `infrastructure/judge0-worker/`) that extends the judge0 image with `CMD ["bash", "-c", "./scripts/workers"]` — this is required because `railway add --image` doesn't support custom start commands via CLI.

### Auth

- `AUTHN_HEADER: X-Auth-Token` — header name callers must send
- `AUTHN_TOKEN: <random-secret>` — set in Railway env vars AND in Next.js env vars as `JUDGE0_AUTH_TOKEN`

---

## 2. Railway CLI Deployment Steps

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init --name zuzu-judge0

# Add services
railway add --image judge0/judge0:latest          # judge0-server
railway add --database postgres                    # postgres
railway add --image bitnami/redis:7.2.5            # redis
# worker: deployed via local Dockerfile (see infrastructure/judge0-worker/)
railway add                                        # judge0-worker (select local dir)

# Set env vars for judge0-server
railway variable set --service judge0-server \
  POSTGRES_HOST='${{Postgres.RAILWAY_PRIVATE_DOMAIN}}' \
  POSTGRES_PORT=5432 \
  POSTGRES_DB=judge0 \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD='${{Postgres.POSTGRES_PASSWORD}}' \
  REDIS_HOST='${{Redis.RAILWAY_PRIVATE_DOMAIN}}' \
  REDIS_PORT=6379 \
  REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}' \
  AUTHN_HEADER=X-Auth-Token \
  AUTHN_TOKEN=<random-secret> \
  SECRET_KEY_BASE=<random-secret> \
  PORT=2358 \
  MAX_FILE_SIZE=1024 \
  MAX_MAX_FILE_SIZE=4096 \
  MAX_NUMBER_OF_RUNS=20 \
  NUMBER_OF_RUNS=1

# Set same vars for judge0-worker
railway variable set --service judge0-worker \
  POSTGRES_HOST='${{Postgres.RAILWAY_PRIVATE_DOMAIN}}' \
  POSTGRES_PORT=5432 \
  POSTGRES_DB=judge0 \
  POSTGRES_USER=postgres \
  POSTGRES_PASSWORD='${{Postgres.POSTGRES_PASSWORD}}' \
  REDIS_HOST='${{Redis.RAILWAY_PRIVATE_DOMAIN}}' \
  REDIS_PORT=6379 \
  REDIS_PASSWORD='${{Redis.REDIS_PASSWORD}}' \
  SECRET_KEY_BASE=<same-as-server>

# Generate public domain for judge0-server
railway domain --service judge0-server
# → e.g. https://judge0-server-xxxx.up.railway.app

# Deploy worker from local Dockerfile
railway up --service judge0-worker
```

### `infrastructure/judge0-worker/Dockerfile`

```dockerfile
FROM judge0/judge0:latest
CMD ["bash", "-c", "./scripts/workers"]
```

---

## 3. `judge0.ts` Changes

### Env vars

| Old | New |
|-----|-----|
| `JUDGE0_API_KEY` | `JUDGE0_AUTH_TOKEN` |
| `JUDGE0_API_HOST` | `JUDGE0_BASE_URL` (e.g. `https://judge0-server-xxxx.up.railway.app`) |

### Headers

| Old (RapidAPI) | New (self-hosted) |
|---|---|
| `x-rapidapi-key: <key>` | `X-Auth-Token: <token>` |
| `x-rapidapi-host: <host>` | *(removed)* |

### Async submission flow (replaces `?wait=true`)

The current `?wait=true` is not recommended for self-hosted Judge0 (doesn't scale, may be disabled). Switch to async polling:

```
1. POST /submissions                     → { token }
2. loop:
     GET /submissions/{token}?fields=stdout,stderr,status,time,memory
     if status.id >= 3: done             (3=Accepted, 4+=error)
     else: wait 500ms, retry
3. timeout after 30s → return TLE error
```

`runTests()` stays parallel — all test case submissions are POSTed at once, then all tokens are polled concurrently via `Promise.allSettled`.

Status IDs: `1` = In Queue, `2` = Processing, `3` = Accepted, `4` = Wrong Answer, `5` = TLE, `6` = Compilation Error, `11` = Runtime Error, `13` = Internal Error.

### `getUsage()` changes

Removed — no longer calls Judge0 `config_info`. The `/api/code/usage` route now queries Neon directly for the current user's rate limit state.

---

## 4. Rate Limiting — Neon DB

### Migration: `app/migrations/YYYYMMDD_code_runs.sql`

```sql
CREATE TABLE code_runs (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_code_runs_user_executed ON code_runs (user_id, executed_at DESC);
```

No FK to users — `user_id` is the Neon Auth user ID string. Rows are never deleted (cheap storage, useful for analytics).

### Rate limit check — single query

```sql
SELECT
  COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '1 minute')  AS per_min,
  COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '3 hours')   AS per_3hr,
  COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '24 hours')  AS per_day
FROM code_runs
WHERE user_id = $1
  AND executed_at > NOW() - INTERVAL '24 hours';
```

### Default limits

| Window | Limit |
|--------|-------|
| Per minute | 10 runs |
| Per 3 hours | 100 runs |
| Per day | 300 runs |

### Counting rules

- `/api/code/run` = 1 run (raw stdout)
- `/api/code/test` = 1 run (all test cases together, regardless of how many)
- Unauthenticated requests → `401` (no execution without auth)
- Rate limit exceeded → `429` with JSON body: `{ error, window, resetAt }`

### Insert on success

Insert into `code_runs` **after** Judge0 returns a result (not before — don't charge for failures caused by our infra).

### New helper: `app/src/lib/rate-limit.ts`

Shared by `/api/code/run` and `/api/code/test`:

```typescript
// checkRateLimit(userId) → throws RateLimitError or returns void
// recordRun(userId)      → inserts into code_runs
// getUserUsage(userId)   → returns { perMin, per3hr, perDay, limits, resetsAt }
```

---

## 5. Env Var Changes

### Remove from `app/.env.local`

```
JUDGE0_API_KEY
JUDGE0_API_HOST
```

### Add to `app/.env.local`

```
JUDGE0_BASE_URL       # Railway public URL of judge0-server
JUDGE0_AUTH_TOKEN     # Matches AUTHN_TOKEN set in Railway
```

---

## 6. Client-Side `RateLimitContext` Changes

Current: tracks usage in `localStorage` against a hardcoded 50/day limit (RapidAPI workaround).

New:
- **Remove** localStorage tracking and the `increment()` pattern
- **Keep** the context shape (`remaining`, `resetAt`, `isSyncing`) — UI already consumes it
- `/api/code/usage` returns `{ perMin, per3hr, perDay, limits }` from Neon — context fetches this on mount and after each run
- On a `429` response from run/test routes, the error body provides `resetAt` → feeds directly into the rate limit display

---

## 7. Files Changed

| File | Change |
|------|--------|
| `infrastructure/judge0-worker/Dockerfile` | New — worker Docker image with custom start command |
| `app/migrations/YYYYMMDD_code_runs.sql` | New — code_runs table + index |
| `app/src/lib/judge0.ts` | New auth headers, async polling, remove RapidAPI specifics |
| `app/src/lib/rate-limit.ts` | New — checkRateLimit, recordRun, getUserUsage helpers |
| `app/src/app/api/code/run/route.ts` | Add auth check, rate limit check + insert |
| `app/src/app/api/code/test/route.ts` | Add auth check, rate limit check + insert |
| `app/src/app/api/code/usage/route.ts` | Query Neon via getUserUsage instead of Judge0 config_info |
| `app/src/context/rate-limit-context.tsx` | Remove localStorage, fetch from /api/code/usage |
| `CLAUDE.md` (root) | Update env var docs |

---

## 8. Out of Scope

- Autoscaling workers (Railway supports manual scaling via dashboard)
- Custom execution time limits per lesson (Judge0 supports `cpu_time_limit` per submission — future enhancement)
- Purging old `code_runs` rows (not needed at current scale)
