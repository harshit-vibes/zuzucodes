# Schema Hardening + Data Quality — Design

**Date**: 2026-02-25
**Status**: Approved

## Goals

1. Normalize `lessons.test_cases` JSONB → proper `test_cases` table
2. Normalize `lessons.problem` JSONB → flat columns on `lessons`
3. Keep `modules.quiz_form` as JSONB but add structural CHECK constraint
4. Tighten nullability and range constraints across all tables
5. Write a reusable validation script (`scripts/validate-content.mjs`)
6. Fix Judge0 test harness — JSON-normalised comparison (supports bool, list, dict)
7. Purge and reseed all content with fully compliant data

---

## Section 1 — Schema Changes

### 1a. New `test_cases` table

Replaces `lessons.test_cases JSONB`.

```sql
CREATE TABLE test_cases (
  id          TEXT PRIMARY KEY,                        -- 'tc-{lessonId}-{position}'
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  description TEXT NOT NULL,
  args        JSONB NOT NULL DEFAULT '[]',             -- always a JSON array
  expected    JSONB NOT NULL,                          -- any JSON-serialisable value
  visible     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (lesson_id, position),
  CHECK (position >= 0),
  CHECK (jsonb_typeof(args) = 'array')
);
```

### 1b. `lessons.problem` → flat columns

```sql
ALTER TABLE lessons
  DROP COLUMN problem,
  DROP COLUMN test_cases,
  ADD COLUMN problem_summary     TEXT,
  ADD COLUMN problem_constraints TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN problem_hints       TEXT[] NOT NULL DEFAULT '{}';
```

`problem_summary` is nullable at DB level — validation script flags lessons where it is null.

### 1c. Additional constraints

```sql
-- lessons: entry_point required when code_template is set
ALTER TABLE lessons ADD CONSTRAINT lessons_entry_point_requires_template
  CHECK ((entry_point IS NULL) OR (code_template IS NOT NULL));

-- modules: strengthen quiz_form structural validation
ALTER TABLE modules DROP CONSTRAINT modules_quiz_required;
ALTER TABLE modules ADD CONSTRAINT modules_quiz_required CHECK (
  quiz_form IS NOT NULL AND
  (quiz_form->>'title') IS NOT NULL AND
  jsonb_typeof(quiz_form->'questions') = 'array' AND
  jsonb_array_length(quiz_form->'questions') >= 1 AND
  (quiz_form->>'passingScore') IS NOT NULL AND
  (quiz_form->>'passingScore')::integer BETWEEN 0 AND 100
);

-- user_quiz_attempts: score range
ALTER TABLE user_quiz_attempts ADD CONSTRAINT uqa_score_range
  CHECK (score_percent BETWEEN 0 AND 100);

-- lessons: index non-negative
ALTER TABLE lessons ADD CONSTRAINT lessons_index_nonneg
  CHECK (lesson_index >= 0);
```

---

## Section 2 — Validation Script

**File:** `app/scripts/validate-content.mjs`

Connects to DB via `DATABASE_URL` from `app/.env.local`. Exits 0 if clean, 1 if violations found.

**Checks:**
- Every lesson has `code_template`
- Every lesson with `code_template` has `entry_point`
- Every lesson with `entry_point` has ≥ 1 row in `test_cases`
- Every lesson with test_cases has `solution_code`
- Every lesson has `problem_summary` set (non-null, non-empty)
- `modules.lesson_count` matches actual `COUNT(lessons)` per module
- Each `quiz_form` question has: `id`, `statement`, `correctOption`, `explanation`
- Each question has ≥ 2 options and `correctOption` references a valid option id
- No orphaned `test_cases` rows (lesson_id not in lessons)
- No orphaned `user_code` rows (lesson_id not in lessons)

**Output on failure:**
```
✗ lesson-intro-python-hello-world-00: missing solution_code
✗ module-intro-python-hello-world-001: lesson_count=3 but actual=2
2 errors found.
```

---

## Section 3 — Judge0 Harness Fix

**Problem:** `String(tc.expected)` comparison breaks for booleans, lists, dicts, None.

| Return type | Python `print()` | `String(expected)` | Match? |
|-------------|------------------|-------------------|--------|
| `"Hello"` | `Hello` | `Hello` | ✓ |
| `True` | `True` | `true` | ✗ |
| `[1, 2]` | `[1, 2]` | `1,2` | ✗ |
| `None` | `None` | `null` | ✗ |

**Fix in `app/src/lib/judge0.ts` — `runTests`:**

Test program template:
```python
{userCode}

import json as _json
_args = _json.loads({JSON.stringify(argsJson)})
_result = {entryPoint}(*_args)
print(_json.dumps(_result, separators=(',', ':')))
```

Pass comparison:
```ts
// Before
got === String(tc.expected)

// After
got === JSON.stringify(tc.expected)
```

This makes `expected` a proper JSON-typed contract. `visible` field removed from `TestCase`
interface (it's now a real DB column, not sent to the client in test execution requests).

Also migrate N separate `fetch` calls to `/submissions/batch` — one HTTP round-trip for all
test cases instead of N parallel requests.

---

## Section 4 — Seed Data

Seed script: `app/scripts/seed-content.mjs`
- Deletes all courses (cascades to modules → lessons → test_cases, user_code)
- Inserts fresh compliant data
- Calls validate-content.mjs at the end — fails loudly if anything is wrong

### Course
```
id:    course-intro-python-001
title: Introduction to Python
slug:  intro-to-python
tag:   Python
```

### Module
```
id:           module-intro-python-hello-world-001
title:        Hello, World!
lesson_count: 3
quiz_form:    (unchanged — 2 questions, passingScore: 70)
```

### Lesson 0 — "What is Python?"
```
lesson_index:  0
entry_point:   is_python
code_template: def is_python():\n    # Return True to confirm we're in Python\n    pass
solution_code: def is_python():\n    return True
problem_summary: "Python is a language that runs code you write. Prove it by writing a
                  function that returns True."
problem_hints: ["Use the return keyword", "True with a capital T is Python's boolean value"]

test_cases:
  position 0: description="confirms we're using Python", args=[], expected=true, visible=true
```

### Lesson 1 — "Your First Python Function"
```
lesson_index:  1
entry_point:   greet
code_template: def greet():\n    # Return the string "Hello, World!"\n    pass
solution_code: def greet():\n    return "Hello, World!"   ← was null
problem_summary: "Write a function named greet that returns the string 'Hello, World!' —
                  the classic first program."
problem_hints: ["Functions use the def keyword", "Use return, not print()"]

test_cases:
  position 0: description="returns Hello, World!", args=[], expected="Hello, World!", visible=true
```

### Lesson 2 — "String Formatting with f-strings"
```
lesson_index:  2
entry_point:   make_greeting
solution_code: (unchanged)
problem_summary: "Use an f-string to greet someone by name. make_greeting('Python')
                  should return 'Hello, Python!'."
problem_constraints: ["Use an f-string (f'...')", "Parameter is named name"]
problem_hints: ["f-strings start with f before the quote", "Embed variables with {curly braces}"]

test_cases:
  position 0: description="greets Python", args=["Python"], expected="Hello, Python!", visible=true
  position 1: description="greets World",  args=["World"],  expected="Hello, World!",  visible=false
```

---

## Section 5 — Migration & Execution Order

1. **DB migration** (`app/migrations/2026-02-25-schema-hardening.sql`)
   - Drop `lessons.test_cases`, `lessons.problem`
   - Add `lessons.problem_summary`, `problem_constraints[]`, `problem_hints[]`
   - Create `test_cases` table
   - Add new CHECK constraints
   - Truncate `user_code`, `user_quiz_attempts` (user data reset)

2. **Seed script** (`app/scripts/seed-content.mjs`)
   - DELETE all courses (cascades everything)
   - INSERT course → module → lessons → test_cases
   - Run validate-content.mjs internally — exits 1 on failure

3. **`judge0.ts` harness fix**
   - JSON-normalised program + comparison
   - Migrate to `/submissions/batch`

4. **TypeScript types**
   - Remove `TestCase.visible` from interface
   - Remove `LessonProblem` interface
   - Add `problem_summary`, `problem_constraints`, `problem_hints` to `LessonData`
   - Update `getLesson` SQL query

5. **`ProblemPanel`** — consume new flat props instead of `problem: LessonProblem`

6. **Validate script** — standalone, runnable as `node app/scripts/validate-content.mjs`
