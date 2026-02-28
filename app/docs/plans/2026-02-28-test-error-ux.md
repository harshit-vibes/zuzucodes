# Test Error UX Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw Python tracebacks in the test results panel with parsed, readable error display — a single banner when all tests share the same runtime error, or per-row error display when failures are mixed.

**Architecture:** Add a required `kind` discriminator to `TestCaseResult` at the data layer (`judge0.ts`), parse errors there using the existing `parsePythonError` utility, then update the display layer (`output-panel.tsx`) to render accordingly.

**Tech Stack:** TypeScript, React, existing `parsePythonError` / `ParsedError` from `@/lib/python-output`

---

## Data Shape

```ts
// src/lib/judge0.ts

export interface TestCaseResult {
  d: string;
  pass: boolean;
  got: string;         // raw stdout or stderr (kept for reference)
  exp: unknown;
  kind: 'wrong-answer' | 'runtime-error';   // required — no backwards compat
  error?: ParsedError;                        // present when kind === 'runtime-error'
}
```

## Data Layer Changes (`judge0.ts`)

In `runTests`, all three result paths set `kind`:

| Status | pass | kind | error |
|--------|------|------|-------|
| Accepted + stdout matches expected | `true` | `'wrong-answer'` | — |
| Accepted + stdout doesn't match | `false` | `'wrong-answer'` | — |
| Non-accepted (stderr present) | `false` | `'runtime-error'` | `parsePythonError(stderr)` |

## Display Layer Changes (`output-panel.tsx`)

### `TestResultsList` — banner logic

```
allFailures = results.filter(r => !r.pass)

if allFailures.every(r => r.kind === 'runtime-error')
  AND all share same error.errorType + error.message:
    → render single <ErrorBanner error={allFailures[0].error}>
    → rows stay collapsed, no expand chevron

else:
    → no banner
    → each row handles its own rendering (see TestResultRow)
```

### `TestResultRow` — expanded view by kind

- `kind === 'wrong-answer'`: existing expected/got diff (unchanged)
- `kind === 'runtime-error'`: show `<ErrorDisplay error={result.error}>` — type, message, line number; no raw traceback, no expected/got diff

### `ErrorBanner` (new component)

Sits above the test list. Shows:
- Error type + message (prominent)
- Line number if available
- All test rows still visible below (collapsed, non-expandable)
