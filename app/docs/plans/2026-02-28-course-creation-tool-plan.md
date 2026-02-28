# Course Creation Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** A `/create-course` Claude Code skill that orchestrates 6 specialised Task subagents to generate schema-validated JSON course content and seed it to the platform DB.

**Architecture:** 4 TypeScript utility scripts in `app/scripts/create-course/`, 6 agent prompt files in `app/scripts/create-course/prompts/`, and 1 Claude Code skill at `~/.claude/skills/create-course/skill.md`. Content lands in `app/content/{course-slug}/` as JSON files, seeded via a new idempotent seeder script.

**Tech Stack:** TypeScript (tsx runner), existing Zod schemas (`app/src/lib/templates/schemas.ts`), existing `assertValidContent`, `@neondatabase/serverless`, the self-hosted Python executor (same submit-then-poll pattern as `app/src/lib/judge0.ts`).

---

### Task 1: Type definitions

**Files:**
- Create: `app/scripts/create-course/types.ts`

Context: Lessons in the DB have no `slug` column — the file name carries it. Modules and courses do have `slug`. Quiz and confidence form shapes mirror `modules.quiz_form` and `courses.confidence_form` JSONB. The `_status` field is a local sentinel — never seeded.

**Step 1: Create the file**

```typescript
// app/scripts/create-course/types.ts
import type { TemplateContent } from '../../src/lib/templates/types';

// ── Quiz ───────────────────────────────────────────────────────────────────────
export interface QuizOption {
  id: 'a' | 'b' | 'c' | 'd';
  text: string;
}

export interface QuizQuestion {
  id: string;
  statement: string;
  options: QuizOption[];
  correctOption: 'a' | 'b' | 'c' | 'd';
  explanation: string;
}

export interface QuizForm {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

// ── Confidence form ────────────────────────────────────────────────────────────
export interface ConfidenceQuestion {
  id: string;
  statement: string;
}

export interface ConfidenceForm {
  title: string;
  questions: ConfidenceQuestion[];
}

// ── Test cases ─────────────────────────────────────────────────────────────────
export interface TestCaseJson {
  id: string;
  position: number;
  description: string;
  args: unknown[];
  expected: unknown;
  visible: boolean;
}

// ── Lesson ─────────────────────────────────────────────────────────────────────
// _status values:
//   'pending'          — not yet generated
//   'content-complete' — Lesson Content Agent done; Code Challenge Agent not yet run
//   'verify-failed'    — Code Challenge Agent ran but executor verification failed after 3 retries
//   'complete'         — all fields populated, executor verified, human approved
//   'todo'             — skipped by user (seeder skips these)
export type UnitStatus = 'pending' | 'content-complete' | 'verify-failed' | 'complete' | 'todo';

export interface LessonJson {
  id: string;
  lesson_index: number;
  title: string;
  content: string;
  code_template: string;
  solution_code: string;
  entry_point: string;
  problem_summary: string;
  problem_constraints: string[];
  problem_hints: string[];
  intro_content: TemplateContent<'lesson-intro'>;
  outro_content: TemplateContent<'lesson-outro'>;
  test_cases: TestCaseJson[];
  _status: UnitStatus;
}

// ── Module ─────────────────────────────────────────────────────────────────────
export interface ModuleJson {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  lesson_count: number;
  quiz_form: QuizForm | null;   // null until Quiz Agent runs
  intro_content: TemplateContent<'module-intro'>;
  outro_content: TemplateContent<'module-outro'>;
  _status: UnitStatus;
}

// ── Course ─────────────────────────────────────────────────────────────────────
export interface CourseJson {
  id: string;
  title: string;
  slug: string;
  description: string;
  outcomes: string[];
  tag: string;
  order: number;
  intro_content: TemplateContent<'course-intro'> | null;    // null until Course Content Agent runs
  outro_content: TemplateContent<'course-outro'> | null;
  confidence_form: ConfidenceForm | null;
  _status: UnitStatus;
}

// ── Course outline (orchestration state) ───────────────────────────────────────
export interface OutlineLesson {
  title: string;
  slug: string;
  objectives: string[];
}

export interface OutlineModule {
  title: string;
  slug: string;
  lessons: OutlineLesson[];
}

export interface CourseOutline {
  title: string;
  slug: string;
  tag: string;
  outcomes: string[];
  who_is_this_for: string;
  modules: OutlineModule[];
  // Keys: 'course', 'module:{slug}', 'lesson:{module-slug}:{lesson-index}'
  // 'quiz:{module-slug}', 'course-content'
  status: Record<string, UnitStatus>;
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/scripts/create-course/types.ts
git commit -m "feat: add type definitions for course creation JSON files"
```

---

### Task 2: Validator utility

**Files:**
- Create: `app/scripts/create-course/validator.ts`

Context: Wraps existing Zod schemas from `app/src/lib/templates/schemas.ts`. Returns a flat error list (not a ZodError) so the skill can display field-level messages to the human before approval.

**Step 1: Create the file**

```typescript
// app/scripts/create-course/validator.ts
import { schemas } from '../../src/lib/templates/schemas';
import type { LessonJson, ModuleJson, CourseJson } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateLessonJson(lesson: Partial<LessonJson>): ValidationResult {
  const errors: string[] = [];

  if (!lesson.code_template) errors.push('missing code_template');
  if (!lesson.entry_point)   errors.push('missing entry_point');
  if (!lesson.solution_code) errors.push('missing solution_code');
  if (!lesson.problem_summary?.trim()) errors.push('problem_summary is empty');
  if (!lesson.test_cases || lesson.test_cases.length === 0) errors.push('no test_cases');

  if (lesson.intro_content) {
    const r = schemas['lesson-intro'].safeParse(lesson.intro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (lesson.outro_content) {
    const r = schemas['lesson-outro'].safeParse(lesson.outro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  for (const tc of lesson.test_cases ?? []) {
    if (!tc.description) errors.push(`test_case[${tc.position}]: missing description`);
    if (!Array.isArray(tc.args)) errors.push(`test_case[${tc.position}]: args must be array`);
    if (tc.expected === undefined) errors.push(`test_case[${tc.position}]: missing expected`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateModuleJson(mod: Partial<ModuleJson>): ValidationResult {
  const errors: string[] = [];

  if (mod.intro_content) {
    const r = schemas['module-intro'].safeParse(mod.intro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (mod.outro_content) {
    const r = schemas['module-outro'].safeParse(mod.outro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  const qf = mod.quiz_form;
  if (!qf) {
    errors.push('missing quiz_form');
  } else {
    if (!qf.title) errors.push('quiz_form: missing title');
    if (!Number.isInteger(qf.passingScore) || qf.passingScore < 0 || qf.passingScore > 100)
      errors.push('quiz_form: passingScore must be integer 0–100');
    if (!Array.isArray(qf.questions) || qf.questions.length === 0)
      errors.push('quiz_form: must have at least 1 question');
    for (const q of qf.questions ?? []) {
      if (!q.id)            errors.push(`quiz question: missing id`);
      if (!q.statement)     errors.push(`quiz question ${q.id}: missing statement`);
      if (!q.correctOption) errors.push(`quiz question ${q.id}: missing correctOption`);
      if (!q.explanation)   errors.push(`quiz question ${q.id}: missing explanation`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        errors.push(`quiz question ${q.id}: must have ≥ 2 options`);
      if (!q.options?.some(o => o.id === q.correctOption))
        errors.push(`quiz question ${q.id}: correctOption "${q.correctOption}" not in options`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateCourseJson(course: Partial<CourseJson>): ValidationResult {
  const errors: string[] = [];

  if (course.intro_content) {
    const r = schemas['course-intro'].safeParse(course.intro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`intro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing intro_content');
  }

  if (course.outro_content) {
    const r = schemas['course-outro'].safeParse(course.outro_content);
    if (!r.success) r.error.errors.forEach(e => errors.push(`outro_content.${e.path.join('.')}: ${e.message}`));
  } else {
    errors.push('missing outro_content');
  }

  if (!course.confidence_form) {
    errors.push('missing confidence_form');
  } else if (!Array.isArray(course.confidence_form.questions) || course.confidence_form.questions.length === 0) {
    errors.push('confidence_form: must have at least 1 question');
  }

  return { ok: errors.length === 0, errors };
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/scripts/create-course/validator.ts
git commit -m "feat: add validator utility for course creation JSON files"
```

---

### Task 3: Executor client

**Files:**
- Create: `app/scripts/create-course/executor-client.ts`

Context: Mirrors the submit-then-poll pattern in `app/src/lib/judge0.ts`. The test harness (wrapping user code + json import + result printing) is built locally, same as judge0.ts lines 134–141. Reads env vars from `app/.env.local`. The `expected` comparison is `stdout.trim() === JSON.stringify(expected)` (same as judge0.ts line 166).

**Step 1: Create the file**

```typescript
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
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/scripts/create-course/executor-client.ts
git commit -m "feat: add executor client for code challenge verification in course creation"
```

---

### Task 4: Seeder script

**Files:**
- Create: `app/scripts/create-course/seeder.ts`
- Modify: `app/package.json` (add `create-course-seed` script)

Context: Idempotent upsert — safe to re-run. Reads `app/content/{slug}/` tree, inserts in order: course → modules → lessons → test_cases. `test_cases` uses delete-then-insert (no conflict key on test_cases table). The `_status` field is stripped before DB write. Skips units where `_status === 'todo'` or `_status !== 'complete'` unless `--allow-incomplete` flag passed. Uses `tsx` runner (same as existing `seed` script in package.json).

**Step 1: Create the seeder**

```typescript
// app/scripts/create-course/seeder.ts
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import type { CourseOutline, CourseJson, ModuleJson, LessonJson } from './types';

function loadDatabaseUrl(): string {
  const envPath = join(__dirname, '..', '..', '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in app/.env.local');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

async function seedCourse(
  sql: ReturnType<typeof neon>,
  courseSlug: string,
  contentRoot: string,
  allowIncomplete: boolean,
): Promise<void> {
  const courseDir = join(contentRoot, courseSlug);
  const outline   = readJson<CourseOutline>(join(courseDir, 'course-outline.json'));
  const course    = readJson<CourseJson>(join(courseDir, 'course.json'));

  if (!allowIncomplete && course._status !== 'complete') {
    throw new Error(`course.json._status is "${course._status}" — run with --allow-incomplete to seed anyway`);
  }
  if (course._status === 'todo') {
    console.log(`  skip course ${courseSlug}: marked todo`);
    return;
  }

  // Upsert course
  await sql`
    INSERT INTO courses (id, title, slug, description, outcomes, tag, "order", intro_content, outro_content, confidence_form)
    VALUES (
      ${course.id}, ${course.title}, ${course.slug}, ${course.description},
      ${course.outcomes}, ${course.tag}, ${course.order},
      ${JSON.stringify(course.intro_content)},
      ${JSON.stringify(course.outro_content)},
      ${JSON.stringify(course.confidence_form)}
    )
    ON CONFLICT (id) DO UPDATE SET
      title            = EXCLUDED.title,
      description      = EXCLUDED.description,
      outcomes         = EXCLUDED.outcomes,
      tag              = EXCLUDED.tag,
      "order"          = EXCLUDED."order",
      intro_content    = EXCLUDED.intro_content,
      outro_content    = EXCLUDED.outro_content,
      confidence_form  = EXCLUDED.confidence_form
  `;
  console.log(`  upserted course: ${course.title}`);

  for (const outlineMod of outline.modules) {
    const moduleDir  = join(courseDir, outlineMod.slug);
    const modulePath = join(moduleDir, 'module.json');

    if (!existsSync(modulePath)) {
      if (allowIncomplete) { console.log(`  skip module ${outlineMod.slug}: no module.json`); continue; }
      throw new Error(`module.json missing for ${outlineMod.slug}`);
    }

    const mod = readJson<ModuleJson>(modulePath);
    if (mod._status === 'todo') { console.log(`  skip module ${mod.slug}: marked todo`); continue; }
    if (!allowIncomplete && mod._status !== 'complete') {
      throw new Error(`module ${mod.slug}._status is "${mod._status}" — use --allow-incomplete`);
    }

    await sql`
      INSERT INTO modules (id, course_id, title, slug, description, "order", lesson_count, quiz_form, intro_content, outro_content)
      VALUES (
        ${mod.id}, ${course.id}, ${mod.title}, ${mod.slug}, ${mod.description},
        ${mod.order}, ${mod.lesson_count},
        ${mod.quiz_form ? JSON.stringify(mod.quiz_form) : null},
        ${JSON.stringify(mod.intro_content)},
        ${JSON.stringify(mod.outro_content)}
      )
      ON CONFLICT (id) DO UPDATE SET
        title         = EXCLUDED.title,
        description   = EXCLUDED.description,
        "order"       = EXCLUDED."order",
        lesson_count  = EXCLUDED.lesson_count,
        quiz_form     = EXCLUDED.quiz_form,
        intro_content = EXCLUDED.intro_content,
        outro_content = EXCLUDED.outro_content
    `;
    console.log(`  upserted module: ${mod.title}`);

    const lessonsDir = join(moduleDir, 'lessons');
    if (!existsSync(lessonsDir)) {
      if (allowIncomplete) { console.log(`  skip lessons for ${mod.slug}: no lessons/ dir`); continue; }
      throw new Error(`lessons/ dir missing for ${mod.slug}`);
    }

    const lessonFiles = readdirSync(lessonsDir).filter(f => f.endsWith('.json')).sort();
    for (const lessonFile of lessonFiles) {
      const lesson = readJson<LessonJson>(join(lessonsDir, lessonFile));
      if (lesson._status === 'todo') { console.log(`    skip lesson ${lessonFile}: marked todo`); continue; }
      if (!allowIncomplete && lesson._status !== 'complete') {
        throw new Error(`lesson ${lessonFile}._status is "${lesson._status}" — use --allow-incomplete`);
      }

      await sql`
        INSERT INTO lessons (
          id, module_id, lesson_index, title, content,
          code_template, solution_code, entry_point,
          problem_summary, problem_constraints, problem_hints,
          intro_content, outro_content
        ) VALUES (
          ${lesson.id}, ${mod.id}, ${lesson.lesson_index}, ${lesson.title}, ${lesson.content},
          ${lesson.code_template}, ${lesson.solution_code}, ${lesson.entry_point},
          ${lesson.problem_summary}, ${lesson.problem_constraints}, ${lesson.problem_hints},
          ${JSON.stringify(lesson.intro_content)}, ${JSON.stringify(lesson.outro_content)}
        )
        ON CONFLICT (id) DO UPDATE SET
          title               = EXCLUDED.title,
          content             = EXCLUDED.content,
          code_template       = EXCLUDED.code_template,
          solution_code       = EXCLUDED.solution_code,
          entry_point         = EXCLUDED.entry_point,
          problem_summary     = EXCLUDED.problem_summary,
          problem_constraints = EXCLUDED.problem_constraints,
          problem_hints       = EXCLUDED.problem_hints,
          intro_content       = EXCLUDED.intro_content,
          outro_content       = EXCLUDED.outro_content
      `;

      // Delete + re-insert test_cases (no conflict key on test_cases)
      await sql`DELETE FROM test_cases WHERE lesson_id = ${lesson.id}`;
      for (const tc of lesson.test_cases) {
        await sql`
          INSERT INTO test_cases (id, lesson_id, position, description, args, expected, visible)
          VALUES (
            ${tc.id}, ${lesson.id}, ${tc.position}, ${tc.description},
            ${JSON.stringify(tc.args)}, ${JSON.stringify(tc.expected)}, ${tc.visible}
          )
        `;
      }
      console.log(`    upserted lesson: ${lesson.title} (${lesson.test_cases.length} test cases)`);
    }
  }
}

async function main(): Promise<void> {
  const args          = process.argv.slice(2);
  const courseArg     = args.find(a => a.startsWith('--course='))?.split('=')[1];
  const allowIncomplete = args.includes('--allow-incomplete');

  const sql        = neon(loadDatabaseUrl());
  const contentRoot = join(__dirname, '..', '..', 'content');

  if (!existsSync(contentRoot)) {
    throw new Error('app/content/ not found — create a course first with /create-course');
  }

  const slugs = courseArg
    ? [courseArg]
    : readdirSync(contentRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

  for (const slug of slugs) {
    console.log(`\nSeeding: ${slug}`);
    await seedCourse(sql, slug, contentRoot, allowIncomplete);
  }

  console.log('\nDone. Run: node app/scripts/validate-content.mjs');
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Step 2: Add npm script**

In `app/package.json`, add to `"scripts"`:

```json
"create-course-seed": "tsx scripts/create-course/seeder.ts"
```

So the scripts block becomes:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "seed": "tsx scripts/seed-content.ts",
  "create-course-seed": "tsx scripts/create-course/seeder.ts"
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add app/scripts/create-course/seeder.ts app/package.json
git commit -m "feat: add course content seeder for app/content/ JSON files"
```

---

### Task 5: Structure Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/structure-agent.md`

**Step 1: Create the file**

````markdown
# Structure Agent

## Your job
Design the course outline: module structure, lesson titles, and learning objectives.
Write the result to `course-outline.json`.

## Input
The task description will provide:
- `course_topic` — what the course teaches (e.g. "Python fundamentals")
- `target_audience` — who it's for (e.g. "complete beginners")
- `module_count` — how many modules to create
- `output_dir` — directory to create (e.g. `app/content/intro-to-python/`)

## Output
Create `{output_dir}/course-outline.json`:

```json
{
  "title": "Introduction to Python",
  "slug": "intro-to-python",
  "tag": "Python",
  "outcomes": [
    "Write and run Python programs from scratch",
    "Define functions that take inputs and return outputs",
    "Work with variables, types, and string formatting"
  ],
  "who_is_this_for": "Complete beginners who want a solid, no-shortcuts foundation in Python.",
  "modules": [
    {
      "title": "Hello, World!",
      "slug": "hello-world",
      "lessons": [
        {
          "title": "What is Python?",
          "slug": "what-is-python",
          "objectives": [
            "Understand what Python is and how it executes code line by line",
            "Write a function that returns a boolean value"
          ]
        }
      ]
    }
  ],
  "status": {}
}
```

Also create `{output_dir}/course.json` with the course metadata (no content fields yet):

```json
{
  "id": "course-intro-to-python-001",
  "title": "Introduction to Python",
  "slug": "intro-to-python",
  "description": "Learn Python from scratch — variables, functions, and clean code.",
  "outcomes": ["...same as outline..."],
  "tag": "Python",
  "order": 1,
  "intro_content": null,
  "outro_content": null,
  "confidence_form": null,
  "_status": "pending"
}
```

## Rules
- `slug`: lowercase, hyphens only, no spaces or special chars. Course slug: kebab-case of title.
- `outcomes`: 3–5 course-wide outcomes. Concrete action verbs. ("Write...", "Define...", "Build...")
- `modules`: Each module has 2–4 lessons. Modules build on each other.
- `lessons`: Each lesson has 2–3 objectives. Specific + testable. Not "understand" — prefer "write a function that..."
- Lesson titles: action-oriented ("Making Decisions with if/else") not abstract ("Conditional Statements")
- Module titles: short, conceptual (2–4 words)
- `tag`: single word — e.g. "Python", "JavaScript", "AI"
- `course.id`: `course-{slug}-001`

## After writing
Use the Write tool to create both files.
Then display the course structure as a tree:
```
Introduction to Python
├── Module 1: Hello, World! (3 lessons)
│   ├── Lesson 0: What is Python?
│   ├── Lesson 1: Your First Function
│   └── Lesson 2: String Formatting with f-strings
└── Module 2: Control Flow (3 lessons)
    ├── ...
```
Report: course title, slug, number of modules, total lessons.
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/structure-agent.md
git commit -m "feat: add Structure Agent prompt for course creation"
```

---

### Task 6: Module Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/module-agent.md`

**Step 1: Create the file**

````markdown
# Module Agent

## Your job
Generate the module intro and outro content for one specific module.
Write the result to `module.json` in the module's directory.

## Input
The task description will provide:
- `course_outline` — full contents of `course-outline.json` (pasted inline)
- `module_slug` — which module to generate (e.g. `hello-world`)
- `module_dir` — directory path (e.g. `app/content/intro-to-python/hello-world/`)
- `module_order` — 1-based position of this module in the course

## Output
Write `{module_dir}/module.json`:

```json
{
  "id": "module-{course-slug}-{module-slug}-001",
  "title": "Hello, World!",
  "slug": "hello-world",
  "description": "Your first Python functions — from a simple boolean return to dynamic f-string greetings.",
  "order": 1,
  "lesson_count": 3,
  "quiz_form": null,
  "intro_content": {
    "title": "Hello, World!",
    "description": "Your first Python functions — from a single boolean return to dynamic f-string greetings. By the end you will have defined three functions and understood what makes Python readable.",
    "what_you_learn": [
      "What Python is and how it executes code",
      "How to define a function with def",
      "How to return a value from a function",
      "How to embed variables in strings with f-strings"
    ]
  },
  "outro_content": {
    "recap": "You defined your first three Python functions, learned how def and return work together, and used f-strings to make output dynamic.",
    "next_module": "Variables and Types — storing and working with different kinds of data."
  },
  "_status": "complete"
}
```

## Field guidelines
- `id`: `module-{course-slug}-{module-slug}-001`
- `description`: 1–2 sentences. What this module covers and what the student will build.
- `lesson_count`: exact count of lessons in this module (from course_outline)
- `quiz_form`: always `null` — the Quiz Agent fills this later
- `intro_content.description`: 2–3 sentences. More detailed than `description`.
- `intro_content.what_you_learn`: 3–5 bullets. Match the lesson objectives. Action verbs.
- `outro_content.recap`: 2 sentences. What key skills the student now has. Be specific.
- `outro_content.next_module`: Name of next module + 1-sentence tease. Omit entirely for the last module.

## After writing
Use the Write tool to create the file.
Report: module title, lesson_count, intro description (first sentence), outro recap.
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/module-agent.md
git commit -m "feat: add Module Agent prompt for course creation"
```

---

### Task 7: Lesson Content Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/lesson-content-agent.md`

**Step 1: Create the file**

````markdown
# Lesson Content Agent

## Your job
Generate the Markdown lesson body, problem fields, and lesson intro/outro for one lesson.
The Code Challenge Agent runs separately after you — leave code fields as empty strings/arrays.

## Input
The task description will provide:
- `course_outline` — full contents of `course-outline.json`
- `module_json` — contents of `module.json` for this module (already approved)
- `lesson_title` — title of this lesson
- `lesson_objectives` — array of learning objectives
- `lesson_index` — 0-based index in this module
- `prev_lesson_title` — title of the previous lesson (empty string if first)
- `next_lesson_title` — title of the next lesson (empty string if last lesson in module)
- `output_path` — full path to write (e.g. `app/content/intro-to-python/hello-world/lessons/01-your-first-function.json`)
- `course_slug` — course slug for generating the lesson id
- `module_slug` — module slug

## Output
Write `{output_path}`:

```json
{
  "id": "lesson-{course-slug}-{module-slug}-{lesson_index:02d}",
  "lesson_index": 1,
  "title": "Your First Python Function",
  "content": "A function is a named block...\n\n```python\ndef greet():\n    pass\n```\n\n---\n\nThe `return` keyword...\n\n```python\ndef greet():\n    return \"Hello, World!\"\n```",
  "code_template": "",
  "solution_code": "",
  "entry_point": "",
  "problem_summary": "Write a function named greet that returns the string 'Hello, World!' — the classic first program.",
  "problem_constraints": [],
  "problem_hints": [
    "Functions use the def keyword",
    "Use return, not print()"
  ],
  "intro_content": {
    "hook": "Every useful Python program is built from functions — named blocks of code you define once and call whenever you need them.",
    "outcomes": [
      "Define a function using the def keyword",
      "Use return to send a value back to the caller",
      "Write and call your first Python function"
    ],
    "estimated_minutes": 5
  },
  "outro_content": {
    "recap": "You wrote a function named greet that returns the string \"Hello, World!\". You used def to define it and return to send a value back — the two keywords at the heart of every Python function.",
    "next_lesson_teaser": "Next up: make your greeting dynamic with f-strings."
  },
  "test_cases": [],
  "_status": "content-complete"
}
```

Note: `_status` is `"content-complete"` — signals content is done but code challenge not yet generated.

## Content field guidelines

### `content` (Markdown lesson body)
- 3–6 paragraphs total, split by exactly one `---` separator (one conceptual break)
- Each half: 1–2 prose paragraphs + 1 Python code block
- Code blocks: ```python with concise examples (5–10 lines max)
- No raw HTML. No `<script>` or `<iframe>`.
- Define every new term the first time you use it
- Structure: show the problem → show the concept → show the minimal example — in that order

### `problem_summary`
- 1–2 sentences. Exact function name + what it must do.
- Example: "Write countdown(n) that returns a list counting down from n to 0, inclusive."

### `problem_constraints`
- 1–3 strings. Structural requirements. Leave `[]` if none.
- Example: ["Return a list, not individual values", "Include 0 in the result"]

### `problem_hints`
- 2–3 strings. Increasing specificity. First hint is subtle, last is nearly a spoiler.
- Example: ["Start with result = []", "Use result.append(n) inside the loop", "Return total after the loop"]

### `intro_content.hook`
- 1 sentence. Why this lesson matters. Frame the *problem space*, not the learning outcome.
- Bad: "You will learn to use f-strings." Good: "Hard-coded strings only work for one specific value."

### `intro_content.outcomes`
- 2–3 bullets. What the student can DO after the lesson. Action verbs. Match lesson_objectives.

### `intro_content.estimated_minutes`
- 5 for most lessons. 6–8 if particularly dense.

### `outro_content.recap`
- 2 sentences. Name the function they wrote + the concepts it demonstrated.

### `outro_content.next_lesson_teaser`
- If `next_lesson_title` is not empty: "Next up: {next_lesson_title} — [one phrase about what it covers]."
- If this is the last lesson in the module: "You've finished the module — take the quiz to lock in what you've learned."

## After writing
Use the Write tool to create the file.
Report: lesson title, body paragraph count, problem_summary.
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/lesson-content-agent.md
git commit -m "feat: add Lesson Content Agent prompt for course creation"
```

---

### Task 8: Code Challenge Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/code-challenge-agent.md`

**Step 1: Create the file**

````markdown
# Code Challenge Agent

## Your job
Generate the Python code challenge for a lesson, verify it against the executor, and update the lesson JSON file.

## Input
The task description will provide:
- `lesson_json_path` — path to the lesson JSON (already has content fields from Lesson Content Agent)
- `lesson_title` — lesson title
- `lesson_objectives` — learning objectives
- `lesson_content_summary` — first paragraph of the lesson body (so the challenge matches the teaching)
- `executor_url` — from `app/.env.local`: EXECUTOR_URL
- `executor_api_key` — from `app/.env.local`: EXECUTOR_API_KEY

## What to generate
1. `solution_code` — complete, working Python function(s) that solve the problem
2. `entry_point` — the function name the test harness calls
3. `code_template` — derived from solution: same signature, body replaced with `pass`
4. `test_cases` — 2–4 test cases with concrete args and expected values

## Test case format
```json
[
  {
    "id": "{lesson-id}-tc-0",
    "position": 0,
    "description": "greets Python",
    "args": ["Python"],
    "expected": "Hello, Python!",
    "visible": true
  },
  {
    "id": "{lesson-id}-tc-1",
    "position": 1,
    "description": "greets World",
    "args": ["World"],
    "expected": "Hello, World!",
    "visible": false
  }
]
```

## Test case rules
- `args`: JSON array of arguments passed to `entry_point(*args)`
- `expected`: The exact Python value after JSON serialisation:
  - Python `True` → JSON `true`, `False` → `false`, `None` → `null`
  - Strings: `"Hello, World!"`
  - Numbers: `42`, `3.14`
  - Lists: `[1, 2, 3]` — no spaces between items (separators `(',', ':')`)
  - The test passes when `stdout.strip() == JSON.stringify(expected)`
- First 1–2 cases: `visible: true` (shown to learner)
- Remaining: `visible: false` (hidden edge cases — empty input, boundary value, etc.)
- `id` format: `{lesson-id}-tc-{position}`

## Python code rules
- `solution_code` must be self-contained: use only Python stdlib (no pip installs)
- Keep it under 20 lines
- `code_template`: copy `solution_code`, replace every function body with `pass` (keep signatures, keep comments if helpful)
- `entry_point` must be a valid Python identifier: letters, digits, underscores only

## Verification loop

Read the existing lesson JSON, then:

1. Build the test harness for each test case:
   ```
   {solution_code}

   import json as _json
   _args = _json.loads({JSON.stringify(tc.args)})
   _result = {entry_point}(*_args)
   print(_json.dumps(_result, separators=(',', ':')))
   ```

2. Submit each program to the executor:
   ```
   POST {executor_url}/submissions
   Headers: Content-Type: application/json, X-Api-Key: {executor_api_key}
   Body: { "source_code": "...", "language_id": 71 }
   Response: { "token": "..." }
   ```

3. Poll until done:
   ```
   GET {executor_url}/submissions/{token}
   Headers: X-Api-Key: {executor_api_key}
   Repeat every 500ms until response.status.id >= 3
   ```
   Status id 3 = Accepted. Others = runtime error.

4. Check: `stdout.trim() === JSON.stringify(expected)` for each test case.

5. If ALL pass → update the lesson JSON with all code fields and `_status: "complete"`

6. If any fail → revise `solution_code` and/or `test_cases`, retry. Include failure output in your analysis. Max 3 retries.

7. After 3 failures → write best attempt with `_status: "verify-failed"`. List which test cases failed and why.

## Updating the lesson JSON
Read the existing file (created by Lesson Content Agent), then update ONLY these fields:
- `code_template`
- `solution_code`
- `entry_point`
- `test_cases`
- `_status`

Do NOT overwrite any other fields.

## After updating
Use Read then Write (or Edit) to update the file.
Report: lesson title, entry_point, test case count, verification result (✓ N/N passed or ✗ with failure details).
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/code-challenge-agent.md
git commit -m "feat: add Code Challenge Agent prompt for course creation"
```

---

### Task 9: Quiz Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/quiz-agent.md`

**Step 1: Create the file**

````markdown
# Quiz Agent

## Your job
Generate the module quiz based on the exact content taught in the lessons.
Update `module.json` by setting the `quiz_form` field.

## Input
The task description will provide:
- `module_json_path` — path to `module.json` for this module
- `module_title` — module title
- `lesson_json_paths` — array of paths to all approved lesson JSONs for this module

## Process
1. Read all lesson JSON files. Study `content`, `solution_code`, and `problem_summary` for each.
2. Generate 3–5 quiz questions that test ONLY concepts actually taught in these lessons.
3. Update `module_json_path` by setting `quiz_form` and `_status: "complete"`.

## Output: quiz_form shape
```json
{
  "title": "Hello, World! Quiz",
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "statement": "Which keyword defines a function in Python?",
      "options": [
        { "id": "a", "text": "def" },
        { "id": "b", "text": "function" },
        { "id": "c", "text": "func" },
        { "id": "d", "text": "define" }
      ],
      "correctOption": "a",
      "explanation": "def is the keyword Python uses to introduce a function definition."
    }
  ]
}
```

## Question guidelines
- Questions MUST test concepts from this module only (not general Python or other modules)
- Mix question types: "Which keyword...?", "What does X return?", "What is the output of...?"
- Distractors must be plausible — common mistakes, similar-looking alternatives, or related concepts
- `explanation`: 1–2 sentences. Explains WHY the correct answer is right (not just restating it)
- `passingScore`: always 70
- `id`: sequential — `q1`, `q2`, `q3`...
- Options: exactly 4 per question (ids: a, b, c, d)
- `correctOption`: must match an option `id` in the same question's `options` array

## After updating
Read the module.json, update quiz_form and _status, then write it back using Read + Write.
Report: module title, number of questions, all question statements.
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/quiz-agent.md
git commit -m "feat: add Quiz Agent prompt for course creation"
```

---

### Task 10: Course Content Agent prompt

**Files:**
- Create: `app/scripts/create-course/prompts/course-content-agent.md`

**Step 1: Create the file**

````markdown
# Course Content Agent

## Your job
Generate the course-level intro, outro, and confidence form.
Update `course.json` with these fields.

## Input
The task description will provide:
- `course_json_path` — path to `course.json`
- `course_outline_path` — path to `course-outline.json`
- `module_json_paths` — array of paths to all approved `module.json` files (in order)

## Process
1. Read `course-outline.json` for title, outcomes, who_is_this_for
2. Read all module JSON files to understand the full course arc and what was actually taught
3. Update `course.json` with intro_content, outro_content, confidence_form, and `_status: "complete"`

## Output: fields to set
```json
{
  "intro_content": {
    "hook": "Python is the most readable programming language ever designed — and one of the most powerful.",
    "outcomes": ["Write and run Python programs from scratch", "..."],
    "who_is_this_for": "Complete beginners who want a solid, no-shortcuts foundation in Python."
  },
  "outro_content": {
    "recap": "You have gone from printing your first line of output to writing functions that handle dynamic input. You understand Python's syntax, how functions work, and how to format strings — skills that underpin everything else in the language.",
    "certificate_info": "Complete all lessons and pass the module quizzes to earn your Introduction to Python certificate."
  },
  "confidence_form": {
    "title": "Rate your Python confidence",
    "questions": [
      { "id": "q1", "statement": "How confident are you writing Python functions?" },
      { "id": "q2", "statement": "How confident are you working with loops and conditionals?" }
    ]
  },
  "_status": "complete"
}
```

## Field guidelines

### `intro_content.hook`
- 1–2 sentences. Why this language/topic matters RIGHT NOW. Energising, forward-looking.
- Do NOT start with "In this course..." — frame the bigger picture first.

### `intro_content.outcomes`
- Use the outcomes from course-outline.json (already agreed with course author). Do not invent new ones.

### `outro_content.recap`
- 3–4 sentences. Full arc: where they started → what they built → what they can now do.
- Be specific: name concepts and skills from the actual modules.

### `confidence_form`
- `title`: "Rate your {topic} confidence"
- 3–5 questions. One per major skill area from the modules. Format: "How confident are you [verb + skill]?"
- Map directly to the module topics (not to individual lessons)
- `id`: `q1`, `q2`...

## After updating
Read course.json, update the fields above, write it back.
Report: course title, hook (first sentence), confidence form question count.
````

**Step 2: Commit**

```bash
git add app/scripts/create-course/prompts/course-content-agent.md
git commit -m "feat: add Course Content Agent prompt for course creation"
```

---

### Task 11: The `/create-course` skill

**Files:**
- Create: `~/.claude/skills/create-course/skill.md`

Context: This is the main orchestration file. It tells Claude exactly how to run all stages, dispatch Task subagents (referencing prompt files by path), display approval summaries, and handle the `yes / edit / regenerate / skip` responses. All file paths in the skill are relative to the repo root.

**Step 1: Create the directory and file**

```bash
mkdir -p ~/.claude/skills/create-course
```

Then write `~/.claude/skills/create-course/skill.md`:

````markdown
# Create Course

An internal skill for generating complete, schema-validated course content for zuzu.codes.
Content lands in `app/content/{course-slug}/` as JSON files, seeded to DB via the seeder script.

## Quick start

When invoked, ask the user these questions (one at a time):
1. "What topic does this course teach?" (e.g. "Python fundamentals")
2. "Who is it for?" (e.g. "complete beginners aged 14–25")
3. "How many modules?" (suggest 3–5 if unsure)
4. "Any specific title in mind, or shall I suggest one?"

If a course slug already exists in `app/content/`, skip questions and resume (see Resume section).

---

## Stage 1: Course Structure

Dispatch a Task subagent with the Structure Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/structure-agent.md`

**Tell the subagent:**
- Read the prompt file at `app/scripts/create-course/prompts/structure-agent.md`
- course_topic: {user's answer}
- target_audience: {user's answer}
- module_count: {user's answer}
- output_dir: `app/content/{suggested-slug}/`

After the subagent writes the files, read `course-outline.json` and display as a tree:
```
{Course Title}
├── Module 1: {title} ({N} lessons)
│   ├── Lesson 0: {title}
│   ├── Lesson 1: {title}
│   └── ...
└── Module 2: {title} ({N} lessons)
    └── ...
```

Then ask: **"Approve this structure? [yes / edit / regenerate]"**
- `yes` → update `status.course` to `'complete'`, proceed to Stage 2
- `edit` → ask what to change, apply with Edit tool, re-display tree
- `regenerate [notes]` → re-dispatch Structure Agent, appending notes to the prompt

---

## Stage 2: Content Generation

Work through modules and lessons in order from `course-outline.json`.

### For each module:

#### Step A: Module intro/outro

Dispatch a Task subagent with the Module Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/module-agent.md`

**Tell the subagent:**
- Read the prompt file at `app/scripts/create-course/prompts/module-agent.md`
- course_outline: {paste full contents of course-outline.json}
- module_slug: {slug}
- module_dir: `app/content/{course-slug}/{module-slug}/`
- module_order: {1-based index}

After the subagent writes module.json, display:
```
── Module {N}: {title} ─────────────────────────────
  description: "{description}"
  what_you_learn: {N} items
  outro: "{recap first sentence}..."
  next_module: "{next_module}"

  Validation: {run validator, show result}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateModuleJson} = await import('./scripts/create-course/validator.ts');
const m = JSON.parse(require('fs').readFileSync('content/{course-slug}/{module-slug}/module.json', 'utf8'));
const r = validateModuleJson(m);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

Ask: **"Approve module? [yes / edit / regenerate]"**
- `yes` → update `status['module:{module-slug}']` to `'complete'`, proceed to lessons
- `edit` → ask what to change, apply, re-validate, re-display
- `regenerate [notes]` → re-dispatch Module Agent with notes

#### Step B: For each lesson in this module:

**Lesson Content Agent:**

Dispatch a Task subagent with the Lesson Content Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/lesson-content-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/lesson-content-agent.md`
- course_outline: {paste course-outline.json contents}
- module_json: {paste module.json contents after approval}
- lesson_title: {title from outline}
- lesson_objectives: {objectives from outline}
- lesson_index: {0-based index}
- prev_lesson_title: {previous lesson title or empty string}
- next_lesson_title: {next lesson title or empty string — empty if last lesson in module}
- output_path: `app/content/{course-slug}/{module-slug}/lessons/{index:02d}-{lesson-slug}.json`
- course_slug: {course slug}
- module_slug: {module slug}

**Code Challenge Agent (immediately after Lesson Content Agent):**

Dispatch a Task subagent with the Code Challenge Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/code-challenge-agent.md`

Read `app/.env.local` to get EXECUTOR_URL and EXECUTOR_API_KEY, then tell the subagent:
- Read the prompt at `app/scripts/create-course/prompts/code-challenge-agent.md`
- lesson_json_path: {same output_path as above}
- lesson_title: {lesson title}
- lesson_objectives: {lesson objectives}
- lesson_content_summary: {first paragraph of lesson content}
- executor_url: {EXECUTOR_URL from .env.local}
- executor_api_key: {EXECUTOR_API_KEY from .env.local}

After both agents complete, read the lesson JSON and display:
```
── Lesson {index}: {title} ─────────────────────────
  intro hook: "{hook}"
  body: ~{N} paragraphs, {N} code blocks
  code_challenge: entry_point={entry_point}, {N} test cases ({N} visible)
  solution: {first line of solution_code}
  executor: {✓ N/N tests pass  OR  ✗ verify-failed: list failures}
  outro teaser: "{next_lesson_teaser}"

  Validation: {run validator, show result}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateLessonJson} = await import('./scripts/create-course/validator.ts');
const l = JSON.parse(require('fs').readFileSync('content/{course-slug}/{module-slug}/lessons/{file}.json', 'utf8'));
const r = validateLessonJson(l);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

Ask: **"Approve lesson? [yes / edit / regenerate / skip]"**
- `yes` → update `status['lesson:{module-slug}:{lesson-index}']` to `'complete'`, proceed to next lesson
- `edit` → ask what to change, apply, re-validate, re-display
- `regenerate [notes]` → re-dispatch both agents with notes (regenerate either content, challenge, or both — ask user which)
- `skip` → set `_status: 'todo'` in the lesson JSON, update status to `'todo'`, proceed to next lesson

#### Step C: Module quiz (after all lessons in the module approved)

Dispatch a Task subagent with the Quiz Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/quiz-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/quiz-agent.md`
- module_json_path: `app/content/{course-slug}/{module-slug}/module.json`
- module_title: {title}
- lesson_json_paths: array of all lesson JSON paths for this module

After the subagent updates module.json, display:
```
── Quiz: {module title} ────────────────────────────
  title: "{quiz title}"
  passingScore: {N}%
  questions:
    q1: {statement}
    q2: {statement}
    ...

  Validation: {run validator}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateModuleJson} = await import('./scripts/create-course/validator.ts');
const m = JSON.parse(require('fs').readFileSync('content/{course-slug}/{module-slug}/module.json', 'utf8'));
const r = validateModuleJson(m);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

Ask: **"Approve quiz? [yes / edit / regenerate]"**
- `yes` → update `status['quiz:{module-slug}']` to `'complete'`, proceed to next module
- `edit` → ask what to change, apply to module.json, re-validate, re-display
- `regenerate [notes]` → re-dispatch Quiz Agent with notes

---

## Stage 3: Course-level content

After all modules are approved:

Dispatch a Task subagent with the Course Content Agent prompt.

**Read prompt from:** `app/scripts/create-course/prompts/course-content-agent.md`

**Tell the subagent:**
- Read the prompt at `app/scripts/create-course/prompts/course-content-agent.md`
- course_json_path: `app/content/{course-slug}/course.json`
- course_outline_path: `app/content/{course-slug}/course-outline.json`
- module_json_paths: array of all module.json paths in order

After the subagent updates course.json, display:
```
── Course: {title} ─────────────────────────────────
  hook: "{hook}"
  outcomes: {N} items
  confidence form: {N} questions
    - {question 1}
    - {question 2}
    ...
  outro: "{recap first sentence}..."

  Validation: {run validator}
```

Run validation:
```bash
cd app && npx tsx -e "
const {validateCourseJson} = await import('./scripts/create-course/validator.ts');
const c = JSON.parse(require('fs').readFileSync('content/{course-slug}/course.json', 'utf8'));
const r = validateCourseJson(c);
console.log(r.ok ? '✓ schema valid' : r.errors.join('\n  '));
"
```

Ask: **"Approve course content? [yes / edit / regenerate]"**
- `yes` → update `status['course-content']` to `'complete'`, proceed to seed
- `edit` → ask what to change, apply, re-validate, re-display
- `regenerate [notes]` → re-dispatch Course Content Agent with notes

---

## Stage 4: Seed to DB

After all content approved:

```bash
cd app && npm run create-course-seed -- --course={course-slug}
```

Then validate:

```bash
node app/scripts/validate-content.mjs
```

Report results. If ✓:
"Course '{title}' is live. Visit http://localhost:3000/dashboard to preview."

If errors: display them and ask the user how to fix.

---

## Resume behaviour

When invoked on an existing slug (check `app/content/` for directory):
1. Read `course-outline.json` status field
2. Tell the user: "Found existing course '{title}'. Status: {N}/{total} units complete."
3. Skip units where `status[key] === 'complete'`
4. Resume from first non-complete, non-todo unit

---

## Updating status

After each approval, read `course-outline.json`, update the relevant `status` key, and write it back.

Status key format:
- Course structure: `'course'`
- Module intro/outro: `'module:{module-slug}'`
- Lesson: `'lesson:{module-slug}:{lesson-index}'`
- Module quiz: `'quiz:{module-slug}'`
- Course content: `'course-content'`
````

**Step 2: Verify the skill appears in Claude Code**

Close and reopen Claude Code (or start a new session). Run `/create-course` to confirm it loads. The skill system reminder should list `create-course` in the available skills.

**Step 3: Commit**

```bash
# Note: ~/.claude/skills is outside the repo — commit only the prompt files in app/
git add app/scripts/create-course/prompts/course-content-agent.md
# (other prompts already committed in previous tasks)
git commit -m "feat: create-course skill and all agent prompts complete"
```

---

### Task 12: End-to-end smoke test

**Goal:** Verify the full pipeline works without a real AI generation — seed a hand-written fixture and confirm it upserts correctly.

**Step 1: Create fixture directory**

```bash
mkdir -p app/content/test-course/test-module/lessons
```

**Step 2: Write minimal fixture files**

`app/content/test-course/course-outline.json`:
```json
{
  "title": "Test Course",
  "slug": "test-course",
  "tag": "Python",
  "outcomes": ["Write test code"],
  "who_is_this_for": "Test users",
  "modules": [
    {
      "title": "Test Module",
      "slug": "test-module",
      "lessons": [
        { "title": "Test Lesson", "slug": "test-lesson", "objectives": ["Test objective"] }
      ]
    }
  ],
  "status": { "course": "complete", "module:test-module": "complete", "lesson:test-module:0": "complete", "quiz:test-module": "complete", "course-content": "complete" }
}
```

`app/content/test-course/course.json`:
```json
{
  "id": "course-test-course-001",
  "title": "Test Course",
  "slug": "test-course",
  "description": "A smoke test course.",
  "outcomes": ["Write test code"],
  "tag": "Python",
  "order": 99,
  "intro_content": { "hook": "Test hook.", "outcomes": ["Write test code"], "who_is_this_for": "Test users" },
  "outro_content": { "recap": "You finished the test course.", "certificate_info": "Test cert." },
  "confidence_form": { "title": "Rate your test confidence", "questions": [{ "id": "q1", "statement": "How confident are you testing things?" }] },
  "_status": "complete"
}
```

`app/content/test-course/test-module/module.json`:
```json
{
  "id": "module-test-course-test-module-001",
  "title": "Test Module",
  "slug": "test-module",
  "description": "A test module.",
  "order": 1,
  "lesson_count": 1,
  "quiz_form": {
    "title": "Test Quiz",
    "passingScore": 70,
    "questions": [
      {
        "id": "q1",
        "statement": "What does pass do?",
        "options": [
          { "id": "a", "text": "Nothing" },
          { "id": "b", "text": "Returns None" },
          { "id": "c", "text": "Exits the function" },
          { "id": "d", "text": "Prints empty" }
        ],
        "correctOption": "a",
        "explanation": "pass is a no-op placeholder."
      }
    ]
  },
  "intro_content": { "title": "Test Module", "description": "Test description.", "what_you_learn": ["Test thing"] },
  "outro_content": { "recap": "You finished the test module." },
  "_status": "complete"
}
```

`app/content/test-course/test-module/lessons/00-test-lesson.json`:
```json
{
  "id": "lesson-test-course-test-module-00",
  "lesson_index": 0,
  "title": "Test Lesson",
  "content": "This is a test.\n\n```python\ndef test(): pass\n```",
  "code_template": "def is_test():\n    pass",
  "solution_code": "def is_test():\n    return True",
  "entry_point": "is_test",
  "problem_summary": "Return True.",
  "problem_constraints": [],
  "problem_hints": ["Use return True"],
  "intro_content": { "hook": "Test hook.", "outcomes": ["Return True"], "estimated_minutes": 1 },
  "outro_content": { "recap": "You returned True.", "next_lesson_teaser": "That's the end." },
  "test_cases": [
    { "id": "lesson-test-course-test-module-00-tc-0", "position": 0, "description": "returns True", "args": [], "expected": true, "visible": true }
  ],
  "_status": "complete"
}
```

**Step 3: Run seeder against fixture**

```bash
cd app && npm run create-course-seed -- --course=test-course
```

Expected output:
```
Seeding: test-course
  upserted course: Test Course
  upserted module: Test Module
    upserted lesson: Test Lesson (1 test cases)

Done. Run: node app/scripts/validate-content.mjs
```

**Step 4: Run validation**

```bash
node app/scripts/validate-content.mjs
```

Expected: `✓ All content valid.`

**Step 5: Clean up fixture from DB (optional)**

```bash
cd app && node -e "
const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const url = readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(url);
sql\`DELETE FROM courses WHERE id = 'course-test-course-001'\`.then(() => console.log('cleaned up')).catch(console.error);
"
```

**Step 6: Remove fixture files**

```bash
rm -rf app/content/test-course
```

**Step 7: Commit**

```bash
git add app/scripts/create-course/
git commit -m "feat: complete course creation tool — types, validator, executor-client, seeder, agent prompts"
```

---

## Summary of files created

```
app/scripts/create-course/
├── types.ts                          # JSON file type definitions
├── validator.ts                      # Zod-backed validation for lesson/module/course
├── executor-client.ts                # Submit-then-poll executor verification
├── seeder.ts                         # Upsert app/content/ tree to Neon DB
└── prompts/
    ├── structure-agent.md            # Course outline generation
    ├── module-agent.md               # Module intro/outro
    ├── lesson-content-agent.md       # Lesson body + problem fields + intro/outro
    ├── code-challenge-agent.md       # Python code + test cases + executor verification loop
    ├── quiz-agent.md                 # Module quiz grounded in lesson content
    └── course-content-agent.md      # Course intro/outro + confidence form

app/package.json                      # Added create-course-seed script

~/.claude/skills/create-course/
└── skill.md                          # Main orchestration skill (/create-course)
```
