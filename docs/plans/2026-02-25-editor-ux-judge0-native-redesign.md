# Editor UX — Judge0-Native Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Run/Submit bifurcation with a single Judge0-native "Run" button that simultaneously shows console output and test results, while shipping templates as complete runnable programs.

**Architecture:** Two parallel Judge0 calls per Run — one executes the user's code verbatim for stdout, one appends a hidden test harness and compares stdout against expected values. Tests tab is hidden until first Run. ExecutionPhase collapses to `idle | running | run-pass | run-fail | error | tle`.

**Tech Stack:** Next.js 16 App Router, Judge0 CE (via RapidAPI), Neon Postgres, TypeScript

---

## Background

### Why the old design was confusing

1. **Blank console** — function templates (`def greet(): pass`) produce no stdout. After clicking Run, users saw nothing.
2. **Run/Submit as two gates** — Judge0 has no native notion of "run vs submit"; it just executes code and returns stdout. The bifurcation was artificial.
3. **Hidden test runner as optimization hack** — the old design bundled all test cases into one Judge0 submission to save API calls. This created a mismatch between what the user sees (a code editor) and what runs (code + appended JSON test harness).
4. **Tests tab noise** — "Press Submit to run tests" placeholder showed before any action was taken.

### Judge0-native mental model

Write a complete program → execute → inspect stdout. This is how competitive judges (LeetCode, HackerRank) work. The user writes the whole program including the example call; the judge executes it and checks stdout.

---

## Approved Design

### Single "Run" Button

- No Submit button. Running IS testing.
- The button fires two parallel Judge0 calls:
  1. **Console call** — user code verbatim. stdout → Console tab.
  2. **Tests call** — user code + hidden test harness. Results → Tests tab.
- Both calls are `POST /submissions?base64_encoded=false&wait=true`, language_id 71 (Python 3.8).

### Templates as Complete Programs

Templates ship with an example call so the console is never blank:

```python
# lesson 1
def greet():
    # Return the string "Hello, World!"
    pass

print(greet())
```

```python
# lesson 2
def make_greeting(name):
    # Return f"Hello, {name}!"
    pass

print(make_greeting("Alice"))
```

### ExecutionPhase (simplified)

```
idle → running → run-pass   (all tests pass)
                  run-fail   (≥1 test fails)
                  error      (Python exception / compile error)
                  tle        (time limit exceeded)
```

`submit-pass` / `submit-fail` / `submitting` removed.

### Tests Tab Behaviour

- Hidden until first Run (no placeholder noise).
- After Run: shows pass/fail per test case with expected vs actual.
- Auto-advance to next lesson when all tests pass (same as current submit behaviour).

### Auto-save & Lesson Progress

- `/api/code/save` — unchanged, still autosaves on edit.
- `/api/progress/lesson` — called on all-tests-pass, same as current.
- `/api/code/submit` route — **deleted** (no longer needed).

---

## Schema Optimizations

Migration file: `app/migrations/2026-02-25-drop-test-code-gin-index.sql`

```sql
-- 1. Drop dead column (no callers since test_cases migration)
ALTER TABLE lessons DROP COLUMN IF EXISTS test_code;

-- 2. GIN index for JSONB containment queries (rule 8.1)
CREATE INDEX IF NOT EXISTS idx_lessons_test_cases_gin
  ON lessons USING GIN (test_cases)
  WHERE test_cases IS NOT NULL;

-- 3. Integrity constraint: test_cases requires entry_point
ALTER TABLE lessons
  ADD CONSTRAINT lessons_test_cases_entry_point_check
  CHECK (test_cases IS NULL OR entry_point IS NOT NULL);
```

---

## Files Affected

| File | Change |
|------|--------|
| `src/lib/judge0.ts` | Remove `buildTestRunner`. Add `runTests(userCode, testCases, entryPoint)` — N parallel `runCode` calls. Update exports. |
| `src/app/api/code/submit/route.ts` | **Delete** |
| `src/components/lesson/output-panel.tsx` | Simplify `ExecutionPhase` type. Remove submit phases. Hide Tests tab until first Run (`hasRun` flag). |
| `src/components/lesson/code-lesson-layout.tsx` | Remove `handleSubmit`, Submit button, `submitResults` state. Rewrite `handleRun` to fire 2 parallel calls. Pass `hasRun` to OutputPanel. |
| `src/app/dashboard/.../lesson/[order]/page.tsx` | No change needed (testCases + entryPoint props already correct). |
| `migrations/seed-intro-python.mjs` | Add `print(greet())` to lesson 1 template. Add `print(make_greeting("Alice"))` to lesson 2 template. Update lesson content ("Click **Run**" instead of "Click **Submit**"). |
| `migrations/2026-02-25-drop-test-code-gin-index.sql` | **Create** — schema migration per design above. |
