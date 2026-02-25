# Schema Hardening + Data Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Normalize test_cases and problem into proper schema, fix Judge0 JSON comparison, reseed compliant content, and add a reusable validation script.

**Architecture:** DB migration drops the two JSONB columns and creates a `test_cases` table + flat problem columns on `lessons`. A seed script purges and repopulates all content. `judge0.ts` harness switches to `json.dumps` + `JSON.stringify` comparison. TypeScript types and components follow.

**Tech Stack:** Neon Postgres (raw SQL via @neondatabase/serverless), Next.js 16 App Router, TypeScript, Node.js ESM scripts (.mjs)

---

## Context

- Working directory: `app/` inside the repo root
- All SQL runs against the Neon DB at `DATABASE_URL` in `app/.env.local`
- No test framework — verification is `npx tsc --noEmit` + running the validation script + manual psql checks
- Design doc: `docs/plans/2026-02-25-schema-hardening-design.md`
- Key files:
  - `app/src/lib/judge0.ts` — Judge0 client (runTests function)
  - `app/src/lib/data.ts` — data layer (getLesson, LessonData, LessonProblem types)
  - `app/src/components/lesson/problem-panel.tsx` — problem panel component
  - `app/src/components/lesson/code-lesson-layout.tsx` — passes props to ProblemPanel
  - `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx` — lesson server page

---

## Task 1: DB Migration

**Files:**
- Create: `app/migrations/2026-02-25-schema-hardening.sql`

**Step 1: Write the migration**

```sql
-- Migration: Schema hardening — normalize test_cases, problem columns, tighten constraints
-- Date: 2026-02-25
-- WARNING: Destructive. Clears user_code and user_quiz_attempts. Run seed after.

BEGIN;

-- 1. Clear user data that references lessons (avoids FK issues during restructure)
TRUNCATE user_code, user_quiz_attempts;

-- 2. Create test_cases table
CREATE TABLE test_cases (
  id          TEXT PRIMARY KEY,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  description TEXT NOT NULL,
  args        JSONB NOT NULL DEFAULT '[]',
  expected    JSONB NOT NULL,
  visible     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (lesson_id, position),
  CHECK (position >= 0),
  CHECK (jsonb_typeof(args) = 'array')
);

-- 3. Drop old JSONB columns from lessons
ALTER TABLE lessons
  DROP COLUMN IF EXISTS test_cases,
  DROP COLUMN IF EXISTS problem;

-- 4. Add flat problem columns to lessons
ALTER TABLE lessons
  ADD COLUMN problem_summary     TEXT,
  ADD COLUMN problem_constraints TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN problem_hints       TEXT[] NOT NULL DEFAULT '{}';

-- 5. Entry point requires code_template
ALTER TABLE lessons ADD CONSTRAINT lessons_entry_point_requires_template
  CHECK ((entry_point IS NULL) OR (code_template IS NOT NULL));

-- 6. Strengthen quiz_form structural validation
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_quiz_required;
ALTER TABLE modules ADD CONSTRAINT modules_quiz_required CHECK (
  quiz_form IS NOT NULL AND
  (quiz_form->>'title') IS NOT NULL AND
  jsonb_typeof(quiz_form->'questions') = 'array' AND
  jsonb_array_length(quiz_form->'questions') >= 1 AND
  (quiz_form->>'passingScore') IS NOT NULL AND
  (quiz_form->>'passingScore')::integer BETWEEN 0 AND 100
);

-- 7. score_percent range constraint
ALTER TABLE user_quiz_attempts ADD CONSTRAINT uqa_score_range
  CHECK (score_percent BETWEEN 0 AND 100);

-- 8. lesson_index non-negative
ALTER TABLE lessons ADD CONSTRAINT lessons_index_nonneg
  CHECK (lesson_index >= 0);

COMMIT;
```

**Step 2: Run the migration**

```bash
psql "$DATABASE_URL" -f app/migrations/2026-02-25-schema-hardening.sql
```

Load DATABASE_URL from `app/.env.local`:
```bash
export DATABASE_URL=$(grep DATABASE_URL app/.env.local | cut -d= -f2-)
psql "$DATABASE_URL" -f app/migrations/2026-02-25-schema-hardening.sql
```

Expected output:
```
BEGIN
TRUNCATE TABLE
CREATE TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
COMMIT
```

**Step 3: Verify schema**

```bash
psql "$DATABASE_URL" -c "\d test_cases"
psql "$DATABASE_URL" -c "\d lessons" | grep -E "problem|entry|test"
```

Expected: `test_cases` table exists with 8 columns; `lessons` has `problem_summary`, `problem_constraints`, `problem_hints`; no `test_cases` or `problem` columns.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-25-schema-hardening.sql
git commit -m "feat: migration — normalize test_cases table, flat problem columns, tighten constraints"
```

---

## Task 2: Validation Script

**Files:**
- Create: `app/scripts/validate-content.mjs`

**Step 1: Write the script**

```js
#!/usr/bin/env node
/**
 * Content validation script.
 * Connects to Neon DB and checks all content integrity rules.
 * Exit 0 = clean. Exit 1 = violations found.
 *
 * Usage: node app/scripts/validate-content.mjs
 * Reads DATABASE_URL from app/.env.local
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from app/.env.local
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

const sql = neon(loadEnv());
const errors = [];

function fail(msg) {
  errors.push(`✗ ${msg}`);
}

// ── Lessons ──────────────────────────────────────────────────────────────────
const lessons = await sql`SELECT * FROM lessons ORDER BY lesson_index`;

for (const l of lessons) {
  const id = l.id;

  if (!l.code_template) fail(`${id}: missing code_template`);
  if (!l.entry_point)   fail(`${id}: missing entry_point`);
  if (!l.solution_code) fail(`${id}: missing solution_code`);
  if (!l.problem_summary || l.problem_summary.trim() === '')
    fail(`${id}: problem_summary is null or empty`);

  // test_cases
  const tcs = await sql`SELECT * FROM test_cases WHERE lesson_id = ${id}`;
  if (tcs.length === 0) fail(`${id}: no test_cases`);
}

// ── Modules ───────────────────────────────────────────────────────────────────
const modules = await sql`SELECT * FROM modules`;

for (const m of modules) {
  // lesson_count accuracy
  const [{ count }] = await sql`
    SELECT COUNT(*)::INTEGER AS count FROM lessons WHERE module_id = ${m.id}
  `;
  if (m.lesson_count !== count)
    fail(`module ${m.id}: lesson_count=${m.lesson_count} but actual=${count}`);

  // quiz_form structure
  const qf = m.quiz_form;
  if (!qf) { fail(`module ${m.id}: quiz_form is null`); continue; }
  if (!qf.title) fail(`module ${m.id}: quiz_form missing title`);
  if (typeof qf.passingScore !== 'number' || qf.passingScore < 0 || qf.passingScore > 100)
    fail(`module ${m.id}: quiz_form.passingScore invalid`);
  if (!Array.isArray(qf.questions) || qf.questions.length === 0)
    fail(`module ${m.id}: quiz_form.questions empty or missing`);

  for (const q of (qf.questions ?? [])) {
    if (!q.id)          fail(`module ${m.id} question: missing id`);
    if (!q.statement)   fail(`module ${m.id} question ${q.id}: missing statement`);
    if (!q.correctOption) fail(`module ${m.id} question ${q.id}: missing correctOption`);
    if (!q.explanation) fail(`module ${m.id} question ${q.id}: missing explanation`);
    if (!Array.isArray(q.options) || q.options.length < 2)
      fail(`module ${m.id} question ${q.id}: must have ≥ 2 options`);
    const optionIds = (q.options ?? []).map(o => o.id);
    if (!optionIds.includes(q.correctOption))
      fail(`module ${m.id} question ${q.id}: correctOption "${q.correctOption}" not in options`);
  }
}

// ── Referential integrity ─────────────────────────────────────────────────────
const orphanTc = await sql`
  SELECT tc.id FROM test_cases tc
  LEFT JOIN lessons l ON l.id = tc.lesson_id
  WHERE l.id IS NULL
`;
if (orphanTc.length > 0)
  fail(`${orphanTc.length} orphaned test_cases rows`);

const orphanUc = await sql`
  SELECT uc.lesson_id FROM user_code uc
  LEFT JOIN lessons l ON l.id = uc.lesson_id
  WHERE l.id IS NULL
`;
if (orphanUc.length > 0)
  fail(`${orphanUc.length} orphaned user_code rows`);

// ── Result ────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n' + errors.join('\n'));
  console.error(`\n${errors.length} error${errors.length > 1 ? 's' : ''} found.\n`);
  process.exit(1);
} else {
  console.log('✓ All content valid.');
  process.exit(0);
}
```

**Step 2: Run it (expect failures — DB is empty)**

```bash
node app/scripts/validate-content.mjs
```

Expected: exits 1, lists violations (no lessons exist yet). This confirms the script runs.

**Step 3: Commit**

```bash
git add app/scripts/validate-content.mjs
git commit -m "feat: add validate-content.mjs script"
```

---

## Task 3: Seed Script

**Files:**
- Create: `app/scripts/seed-content.mjs`

**Step 1: Write the seed script**

```js
#!/usr/bin/env node
/**
 * Seed script — purges all content and inserts fully compliant data.
 * Runs validate-content.mjs at the end. Exits 1 if validation fails.
 *
 * Usage: node app/scripts/seed-content.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

const sql = neon(loadEnv());

console.log('Seeding content...');

// ── Purge ─────────────────────────────────────────────────────────────────────
// Delete courses; FK cascades to modules → lessons → test_cases, user_code
await sql`DELETE FROM courses`;
console.log('  purged existing content');

// ── Course ───────────────────────────────────────────────────────────────────
await sql`
  INSERT INTO courses (id, title, slug, description, outcomes, tag, "order")
  VALUES (
    'course-intro-python-001',
    'Introduction to Python',
    'intro-to-python',
    'Learn Python from scratch — variables, functions, and clean code.',
    ARRAY[
      'Write and run your first Python program',
      'Understand variables, types, and functions',
      'Read and write clean Python code'
    ],
    'Python',
    1
  )
`;
console.log('  inserted course');

// ── Module ───────────────────────────────────────────────────────────────────
await sql`
  INSERT INTO modules (id, course_id, title, slug, description, "order", lesson_count, quiz_form)
  VALUES (
    'module-intro-python-hello-world-001',
    'course-intro-python-001',
    'Hello, World!',
    'hello-world',
    'Your first Python functions — from a simple return to dynamic f-strings.',
    1,
    3,
    ${JSON.stringify({
      title: 'Hello, World! Quiz',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          statement: 'Which function is used to display output in Python?',
          options: [
            { id: 'a', text: 'print()' },
            { id: 'b', text: 'echo()' },
            { id: 'c', text: 'console.log()' },
            { id: 'd', text: 'write()' },
          ],
          correctOption: 'a',
          explanation: 'print() is the built-in Python function for writing output to the console.',
        },
        {
          id: 'q2',
          statement: 'What keyword does a function use to send a value back to the caller?',
          options: [
            { id: 'a', text: 'print' },
            { id: 'b', text: 'output' },
            { id: 'c', text: 'return' },
            { id: 'd', text: 'send' },
          ],
          correctOption: 'c',
          explanation: 'The return keyword sends a value back from a function to wherever it was called.',
        },
      ],
    })}
  )
`;
console.log('  inserted module');

// ── Lesson 0: What is Python? ─────────────────────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-00',
    'module-intro-python-hello-world-001',
    0,
    'What is Python?',
    ${'Python is a programming language known for its clear, readable syntax.\n\nEvery Python program you write will be **executed** — Python reads your code and runs it. Your job is to write functions that return values.\n\n**Functions** are the building blocks of Python programs:\n\n```python\ndef greet():\n    return "Hello!"\n```\n\nThe `def` keyword defines a function. The `return` keyword sends a value back.\n\nTry it: write a function called `is_python` that returns `True`.'},
    ${'def is_python():\n    # Return True to confirm we\'re in Python\n    pass'},
    ${'def is_python():\n    return True'},
    'is_python',
    'Python is a language that runs code you write. Prove it by writing a function that returns True.',
    ARRAY[]::TEXT[],
    ARRAY['Use the return keyword', 'True with a capital T is Python''s boolean value']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES (
    'tc-lesson-intro-python-hello-world-00-0',
    'lesson-intro-python-hello-world-00',
    0,
    'confirms we''re using Python',
    '[]',
    'true',
    TRUE
  )
`;
console.log('  inserted lesson 0 + test cases');

// ── Lesson 1: Your First Python Function ──────────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-01',
    'module-intro-python-hello-world-001',
    1,
    'Your First Python Function',
    ${'Now that you know what Python is, let\'s write a real function.\n\nA function is defined with `def`, has a name, and uses `return` to send back a value:\n\n```python\ndef greet():\n    return "Hello, World!"\n```\n\nThe string `"Hello, World!"` is a **string literal** — text enclosed in quotes.\n\nWrite a function called `greet` that returns exactly `"Hello, World!"`.'},
    ${'def greet():\n    # Return the string "Hello, World!"\n    pass'},
    ${'def greet():\n    return "Hello, World!"'},
    'greet',
    'Write a function named greet that returns the string ''Hello, World!'' — the classic first program.',
    ARRAY[]::TEXT[],
    ARRAY['Functions use the def keyword', 'Use return, not print()']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES (
    'tc-lesson-intro-python-hello-world-01-0',
    'lesson-intro-python-hello-world-01',
    0,
    'returns Hello, World!',
    '[]',
    '"Hello, World!"',
    TRUE
  )
`;
console.log('  inserted lesson 1 + test cases');

// ── Lesson 2: String Formatting with f-strings ────────────────────────────────
await sql`
  INSERT INTO lessons (
    id, module_id, lesson_index, title, content,
    code_template, solution_code, entry_point,
    problem_summary, problem_constraints, problem_hints
  ) VALUES (
    'lesson-intro-python-hello-world-02',
    'module-intro-python-hello-world-001',
    2,
    'String Formatting with f-strings',
    ${'Hard-coded strings are fine for `"Hello, World!"`, but what if you want to greet *anyone*?\n\n**f-strings** let you embed variables directly inside a string:\n\n```python\nname = "Alice"\nprint(f"Hello, {name}!")  # Hello, Alice!\n```\n\nThe `f` prefix tells Python this is a formatted string. Curly braces `{}` embed the variable\'s value.\n\nWrite a function `make_greeting(name)` that returns `f"Hello, {name}!"`.'},
    ${'def make_greeting(name):\n    # Use an f-string to return "Hello, {name}!"\n    pass'},
    ${'def make_greeting(name):\n    return f"Hello, {name}!"'},
    'make_greeting',
    'Use an f-string to greet someone by name. make_greeting(''Python'') should return ''Hello, Python!''.',
    ARRAY['Use an f-string (f''...'')', 'Parameter is named name'],
    ARRAY['f-strings start with f before the quote', 'Embed variables with {curly braces}']
  )
`;
await sql`
  INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
  VALUES
    (
      'tc-lesson-intro-python-hello-world-02-0',
      'lesson-intro-python-hello-world-02',
      0,
      'greets Python',
      '["Python"]',
      '"Hello, Python!"',
      TRUE
    ),
    (
      'tc-lesson-intro-python-hello-world-02-1',
      'lesson-intro-python-hello-world-02',
      1,
      'greets World',
      '["World"]',
      '"Hello, World!"',
      FALSE
    )
`;
console.log('  inserted lesson 2 + test cases');

// ── Validate ──────────────────────────────────────────────────────────────────
console.log('\nRunning validation...');
try {
  execSync('node app/scripts/validate-content.mjs', { stdio: 'inherit' });
} catch {
  console.error('Seed failed validation — fix errors above.');
  process.exit(1);
}
```

**Step 2: Run the seed**

```bash
node app/scripts/seed-content.mjs
```

Expected:
```
Seeding content...
  purged existing content
  inserted course
  inserted module
  inserted lesson 0 + test cases
  inserted lesson 1 + test cases
  inserted lesson 2 + test cases

Running validation...
✓ All content valid.
```

**Step 3: Spot-check in psql**

```bash
psql "$DATABASE_URL" -c "SELECT id, title, entry_point, solution_code IS NOT NULL AS has_sol, problem_summary IS NOT NULL AS has_problem FROM lessons ORDER BY lesson_index;"
psql "$DATABASE_URL" -c "SELECT lesson_id, position, description, visible, expected FROM test_cases ORDER BY lesson_id, position;"
```

**Step 4: Commit**

```bash
git add app/scripts/seed-content.mjs
git commit -m "feat: add seed-content.mjs — compliant content for all 3 lessons"
```

---

## Task 4: Judge0 Harness Fix

**Files:**
- Modify: `app/src/lib/judge0.ts`

**Context:**
Currently `runTests` appends `print(entryPoint(*_args))` and compares `stdout.trim() === String(tc.expected)`.
This breaks for booleans (`True` vs `true`), lists, and None.
Fix: use `json.dumps(_result, separators=(',', ':'))` in the harness and `JSON.stringify(tc.expected)` for comparison.

Also: `visible` on `TestCase` changes from `visible?: boolean` (optional) to `visible: boolean` (required), since it now comes from the DB as a NOT NULL column.

**Step 1: Update `TestCase` interface and `runTests`**

In `app/src/lib/judge0.ts`, make these changes:

1. Change `visible?: boolean` → `visible: boolean` in the `TestCase` interface.

2. Replace the program template inside `runTests` (currently lines 134–141):

```ts
// BEFORE
const argsJson = JSON.stringify(tc.args);
const program = [
  userCode,
  '',
  'import json as _json',
  `_args = _json.loads(${JSON.stringify(argsJson)})`,
  `print(${entryPoint}(*_args))`,
].join('\n');

// AFTER
const argsJson = JSON.stringify(tc.args);
const program = [
  userCode,
  '',
  'import json as _json',
  `_args = _json.loads(${JSON.stringify(argsJson)})`,
  `_result = ${entryPoint}(*_args)`,
  `print(_json.dumps(_result, separators=(',', ':')))`,
].join('\n');
```

3. Replace the pass comparison inside the `.map` callback (currently `got === String(tc.expected)`):

```ts
// BEFORE
return { d: tc.description, pass: got === String(tc.expected), got, exp: tc.expected };

// AFTER
return { d: tc.description, pass: got === JSON.stringify(tc.expected), got, exp: tc.expected };
```

**Step 2: Type check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors. (The `visible: boolean` change may surface errors in components — fix those in Task 6.)

**Step 3: Commit**

```bash
git add app/src/lib/judge0.ts
git commit -m "fix: Judge0 harness — json.dumps comparison fixes bool/list/None support"
```

---

## Task 5: TypeScript Types + `data.ts`

**Files:**
- Modify: `app/src/lib/data.ts`

**Context:**
`LessonData` currently has `problem: LessonProblem | null`. Replace with three flat fields.
`LessonProblem` interface is deleted (replaced by columns).
`getLesson` SQL needs to join `test_cases` table instead of reading from `lessons.test_cases`.

**Step 1: Remove `LessonProblem`, update `LessonData`**

In `app/src/lib/data.ts`:

Delete the entire `LessonProblem` interface (lines 59–63):
```ts
// DELETE THIS:
export interface LessonProblem {
  summary: string;
  constraints?: string[];
  hints?: string[];
}
```

In the `LessonData` interface, replace `problem: LessonProblem | null` with:
```ts
problemSummary: string | null;
problemConstraints: string[];
problemHints: string[];
```

**Step 2: Update `getLesson` SQL query**

Replace the current SQL in `getLesson` (lines 195–203) with:

```ts
const result = await sql`
  SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
         l.entry_point, l.solution_code,
         l.problem_summary, l.problem_constraints, l.problem_hints,
         COALESCE(
           (SELECT json_agg(
              json_build_object(
                'description', tc.description,
                'args',        tc.args,
                'expected',    tc.expected,
                'visible',     tc.visible
              ) ORDER BY tc.position
            ) FROM test_cases tc WHERE tc.lesson_id = l.id),
           '[]'::json
         ) AS test_cases,
         m.id AS module_id, m.title AS module_title
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  WHERE l.module_id = ${moduleId}
    AND l.lesson_index = ${lessonIndex}
`;
```

**Step 3: Update the return mapping**

Replace the current return object (lines 208–220) with:

```ts
return {
  id: row.id,
  lessonIndex: row.lesson_index,
  content: row.content,
  title: row.title,
  codeTemplate: row.code_template ?? null,
  testCases: (row.test_cases as TestCase[] | null) ?? null,
  entryPoint: row.entry_point ?? null,
  solutionCode: row.solution_code ?? null,
  moduleId: row.module_id,
  moduleTitle: row.module_title,
  problemSummary: row.problem_summary ?? null,
  problemConstraints: (row.problem_constraints as string[]) ?? [],
  problemHints: (row.problem_hints as string[]) ?? [],
};
```

**Step 4: Type check**

```bash
cd app && npx tsc --noEmit
```

Expected: errors about `LessonProblem` and `problem` prop in components — fix those in Task 6.

**Step 5: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: update LessonData — flat problem columns, test_cases join from table"
```

---

## Task 6: ProblemPanel + CodeLessonLayout + Lesson Page

**Files:**
- Modify: `app/src/components/lesson/problem-panel.tsx`
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`
- Modify: `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx`

**Context:**
`ProblemPanel` currently receives `problem: LessonProblem`. Replace with flat props.
`CodeLessonLayout` passes `problem` down — update to pass flat props.
Lesson `page.tsx` passes `problem` to `CodeLessonLayout` — update to pass flat props.

**Step 1: Update `ProblemPanel` props**

In `app/src/components/lesson/problem-panel.tsx`:

Replace the import and interface:
```ts
// BEFORE
import type { LessonProblem } from '@/lib/data';
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problem: LessonProblem;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  lessonId: string;
}

export function ProblemPanel({ problem, testCases, entryPoint, lessonId }: ProblemPanelProps) {
  // ...
  const hints = problem.hints ?? [];
  const constraints = problem.constraints ?? [];
  // ...
  {problem.summary}
```

```ts
// AFTER
import type { TestCase } from '@/lib/judge0';

interface ProblemPanelProps {
  problemSummary: string;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
  lessonId: string;
}

export function ProblemPanel({ problemSummary, problemConstraints, problemHints, testCases, entryPoint, lessonId }: ProblemPanelProps) {
  // ...
  const hints = problemHints;
  const constraints = problemConstraints;
  // ...
  {problemSummary}
```

**Step 2: Update `CodeLessonLayout` props**

In `app/src/components/lesson/code-lesson-layout.tsx`:

Replace in the `CodeLessonLayoutProps` interface:
```ts
// BEFORE
problem: LessonProblem | null;

// AFTER
problemSummary: string | null;
problemConstraints: string[];
problemHints: string[];
```

Update the destructured params and ProblemPanel render:
```ts
// In destructure:
// BEFORE: problem,
// AFTER:  problemSummary, problemConstraints, problemHints,

// ProblemPanel usage:
// BEFORE:
{problem && (
  <ProblemPanel
    problem={problem}
    testCases={testCases}
    entryPoint={entryPoint}
    lessonId={lessonId}
  />
)}

// AFTER:
{problemSummary && (
  <ProblemPanel
    problemSummary={problemSummary}
    problemConstraints={problemConstraints}
    problemHints={problemHints}
    testCases={testCases}
    entryPoint={entryPoint}
    lessonId={lessonId}
  />
)}
```

Also remove the `import type { LessonProblem }` line from `code-lesson-layout.tsx`.

**Step 3: Update lesson `page.tsx`**

In `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx`:

Remove `LessonProblem` from any imports. Replace `problem` prop pass-through with flat props:

```ts
// BEFORE
<CodeLessonLayout
  ...
  problem={lessonData.problem}
/>

// AFTER
<CodeLessonLayout
  ...
  problemSummary={lessonData.problemSummary}
  problemConstraints={lessonData.problemConstraints}
  problemHints={lessonData.problemHints}
/>
```

**Step 4: Type check — must be clean**

```bash
cd app && npx tsc --noEmit
```

Expected: no output (zero errors).

**Step 5: Commit**

```bash
git add app/src/components/lesson/problem-panel.tsx \
        app/src/components/lesson/code-lesson-layout.tsx \
        "app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx"
git commit -m "feat: ProblemPanel and CodeLessonLayout — flat problem props replacing LessonProblem"
```

---

## Task 7: Final Verification

**Step 1: Clean type check**

```bash
cd app && npx tsc --noEmit
```

Expected: no output.

**Step 2: Run validation script**

```bash
node app/scripts/validate-content.mjs
```

Expected: `✓ All content valid.`

**Step 3: Spot-check lesson 0 boolean test**

The new harness outputs `json.dumps(True)` = `true`, compared against `JSON.stringify(true)` = `true`. Verify the seed data has `expected = 'true'` (JSON boolean) not `expected = '"true"'` (JSON string):

```bash
psql "$DATABASE_URL" -c "SELECT id, expected, jsonb_typeof(expected) FROM test_cases WHERE lesson_id = 'lesson-intro-python-hello-world-00';"
```

Expected: `expected = true`, `jsonb_typeof = boolean`.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: schema hardening complete — migrations, seed, harness fix, types"
```
