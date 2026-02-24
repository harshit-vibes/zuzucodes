# Judge0 Migration Design

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Migrate code execution from Pyodide (in-browser WebAssembly) to Judge0 (cloud execution via RapidAPI). Remove all Pyodide code. Add a global rate-limit footer showing remaining daily runs and reset time, synced from RapidAPI response headers.

---

## Constraints

- Judge0 basic tier: **50 requests/day**
- API key stored in `.env.local` as `JUDGE0_API_KEY`
- Rate limit tracking: read `X-RateLimit-requests-Remaining` and `X-RateLimit-requests-Reset` from every Judge0 response — no DB writes
- Manual refresh burns 1 API hit (user-initiated only)

---

## Architecture

```
Client (code-lesson-layout)
    │
    ├── POST /api/code/run ──────► Judge0 API (RapidAPI)
    │       └── response: { stdout, stderr, statusId } + headers { Remaining, Reset }
    │
    └── GET /api/code/usage ─────► Judge0 config_info (manual refresh only)

RateLimitContext (wraps dashboard layout)
    ├── updated automatically after every /api/code/run response
    └── updated manually on refresh icon click

GlobalFooter (inside SidebarInset, right side, subtle)
    └── "47 / 50 runs · resets in 3h 12m  ↺"
```

---

## Execution Flow

1. User clicks **run** → `setExecutionPhase('running')` immediately
2. Client POSTs `{ code, testCode }` to `/api/code/run`
3. API route checks if `remaining === 0` → returns 429 early (no Judge0 hit)
4. API route calls Judge0 with `wait=true` (synchronous, no polling)
5. Reads `X-RateLimit-requests-Remaining` + `X-RateLimit-requests-Reset` from response headers
6. Returns `{ stdout, stderr, statusId, remaining, resetAt }` to client
7. Client updates `RateLimitContext` with new values
8. Client sets `executionPhase` to `'success'` or `'error'`

**Rate limit hit (429):** Render "Daily limit reached · resets in Xh Ym" as the error in OutputPanel.

---

## Judge0 API Details

- **Host:** `judge0-ce.p.rapidapi.com`
- **Submit:** `POST /submissions?base64_encoded=false&wait=true`
- **Body:** `{ source_code, language_id: 71 }` (Python 3)
- **Manual refresh:** `GET /config_info`
- **Key headers:** `x-rapidapi-key`, `x-rapidapi-host`

### Status IDs (relevant)
| ID | Meaning |
|----|---------|
| 3  | Accepted (success) |
| 6  | Compilation Error |
| 11 | Runtime Error |
| 5  | Time Limit Exceeded |

---

## ExecutionPhase Changes

Remove `'loading-python'`. New type:

```typescript
type ExecutionPhase = 'idle' | 'running' | 'success' | 'error';
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/judge0.ts` | Judge0 API client (submit, usage) |
| `src/context/rate-limit-context.tsx` | `RateLimitProvider` + `useRateLimit` hook |
| `src/app/api/code/run/route.ts` | POST — execute code via Judge0 |
| `src/app/api/code/usage/route.ts` | GET — manual refresh via config_info |
| `src/components/rate-limit-indicator.tsx` | Footer display component |

---

## Modified Files

| File | Change |
|------|--------|
| `.env.local` | Add `JUDGE0_API_KEY`, `JUDGE0_API_HOST` |
| `src/app/dashboard/layout.tsx` | Wrap with `RateLimitProvider`, add footer indicator |
| `src/components/code-lesson-layout.tsx` | Replace Pyodide with `POST /api/code/run`, remove `loading-python` |
| `src/components/output-panel.tsx` | Remove `loading-python` phase rendering |
| `src/lib/python-output.ts` | No changes needed |

---

## Rate Limit Indicator UI

Location: bottom of `SidebarInset`, right-aligned, always visible
Style: subtle, monospace, muted foreground

```
                                    47 / 50 · resets in 3h 12m  ↺
```

- Numbers turn amber when ≤ 10 remaining
- Numbers turn red when ≤ 5 remaining
- `↺` spins while fetching, clickable for manual sync
