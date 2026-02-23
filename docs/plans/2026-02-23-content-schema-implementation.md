# Content Schema Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dead `module_schema` table + drop `modules.mdx_content` and `modules.schema_version`, creating a clean `content_schema` table with global validation rules for Phase 2 instructor submissions.

**Architecture:** Single `content_schema` table (always-active, global) with three rule sets: `lesson_rules`, `module_rules`, `quiz_rules`. No per-row schema FKs — validation always uses the active schema. `module-schema.ts` is replaced by `content-schema.ts` operating on individual lesson strings rather than multi-section blobs.

**Tech Stack:** Neon Postgres (raw SQL, `@neondatabase/serverless`), Next.js App Router, TypeScript. No test runner — use `npx tsc --noEmit` from `app/` for verification.

**Design doc:** `docs/plans/2026-02-23-content-schema-redesign.md`

---

### Task 1: Write the DB migration

**Files:**
- Create: `app/migrations/20260223-content-schema.sql`

**Step 1: Create the migration file**

```sql
-- Migration: replace module_schema with content_schema, drop dead modules columns
-- Run against: Neon Postgres (zuzu-codes project)

BEGIN;

-- 1. Drop dead columns from modules
ALTER TABLE modules DROP COLUMN IF EXISTS mdx_content;
ALTER TABLE modules DROP COLUMN IF EXISTS schema_version;

-- 2. Drop old table
DROP TABLE IF EXISTS module_schema;

-- 3. Create new table
CREATE TABLE content_schema (
  version     INTEGER PRIMARY KEY,
  description TEXT,
  schema_def  JSONB NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Seed v1 active schema
INSERT INTO content_schema (version, description, schema_def, is_active)
VALUES (
  1,
  'Initial content schema — Python/AI course platform rules',
  '{
    "lesson_rules": {
      "maxChars": 8000,
      "requireH1": true,
      "allowedLanguages": ["python", "bash", "json", "text"],
      "disallowedHtmlPatterns": ["<script", "<iframe"]
    },
    "module_rules": {
      "minLessons": 1,
      "maxLessons": 20,
      "quizOptional": true
    },
    "quiz_rules": {
      "minPassingScore": 50,
      "maxPassingScore": 100,
      "minQuestions": 2,
      "maxQuestions": 20,
      "optionsPerQuestion": 4,
      "requiredFields": ["title", "questions", "passingScore"],
      "requiredQuestionFields": ["id", "statement", "options", "correctOption"],
      "validCorrectOptions": ["a", "b", "c", "d"]
    }
  }'::JSONB,
  TRUE
);

COMMIT;
```

**Step 2: Run the migration**

Get the Neon connection string:
```bash
neonctl connection-string --project-id late-sky-89059162 --org-id org-autumn-breeze-01504295
```

Run:
```bash
psql "<connection-string>" -f app/migrations/20260223-content-schema.sql
```

Expected output:
```
BEGIN
ALTER TABLE
ALTER TABLE
DROP TABLE
CREATE TABLE
INSERT 0 1
COMMIT
```

**Step 3: Verify schema in DB**

```bash
psql "<connection-string>" -c "\d modules" | grep -E "mdx_content|schema_version"
```
Expected: no output (columns gone)

```bash
psql "<connection-string>" -c "SELECT version, is_active FROM content_schema;"
```
Expected: `1 | t`

**Step 4: Commit**

```bash
git add app/migrations/20260223-content-schema.sql
git commit -m "feat: migrate to content_schema, drop modules.mdx_content and schema_version"
```

---

### Task 2: Create `content-schema.ts`

**Files:**
- Create: `app/src/lib/content-schema.ts`

**Step 1: Write the file**

```typescript
import { cache } from 'react';
import { sql } from '@/lib/neon';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

// ========================================
// TYPES
// ========================================

export interface LessonRules {
  maxChars: number;
  requireH1: boolean;
  allowedLanguages: string[];
  disallowedHtmlPatterns: string[];
}

export interface ModuleRules {
  minLessons: number;
  maxLessons: number;
  quizOptional: boolean;
}

export interface QuizRules {
  minPassingScore: number;
  maxPassingScore: number;
  minQuestions: number;
  maxQuestions: number;
  optionsPerQuestion: number;
  requiredFields: string[];
  requiredQuestionFields: string[];
  validCorrectOptions: string[];
}

export interface ContentSchemaDef {
  lesson_rules: LessonRules;
  module_rules: ModuleRules;
  quiz_rules: QuizRules;
}

export interface ContentSchema {
  version: number;
  description: string | null;
  schema_def: ContentSchemaDef;
  is_active: boolean;
  created_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ========================================
// SCHEMA FETCHING
// ========================================

export const getActiveSchema = cache(async (): Promise<ContentSchema | null> => {
  const rows = await sql`SELECT * FROM content_schema WHERE is_active = TRUE LIMIT 1`;
  if (!rows || rows.length === 0) return null;
  return rows[0] as ContentSchema;
});

// ========================================
// LESSON CONTENT VALIDATION
// ========================================

const parser = unified().use(remarkParse).use(remarkGfm);

export function validateLessonContent(
  content: string,
  rules: LessonRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Character limit
  if (content.length > rules.maxChars) {
    errors.push({
      field: 'content',
      message: `Lesson content exceeds ${rules.maxChars} characters (found ${content.length})`,
      code: 'MAX_CHARS_EXCEEDED',
    });
  }

  // Disallowed HTML patterns
  for (const pattern of rules.disallowedHtmlPatterns) {
    if (new RegExp(pattern, 'i').test(content)) {
      errors.push({
        field: 'content',
        message: `Content contains disallowed pattern: ${pattern}`,
        code: 'DISALLOWED_HTML_PATTERN',
      });
    }
  }

  // AST analysis
  const tree = parser.parse(content) as Root;
  let hasH1 = false;
  const codeLanguagesUsed = new Set<string>();

  visit(tree, (node) => {
    if (node.type === 'heading' && (node as any).depth === 1) {
      hasH1 = true;
    }
    if (node.type === 'code') {
      const lang = (node as any).lang as string | null;
      if (lang) codeLanguagesUsed.add(lang);
    }
  });

  // H1 required
  if (rules.requireH1 && !hasH1) {
    errors.push({
      field: 'content',
      message: 'Lesson content must start with an H1 heading',
      code: 'MISSING_H1',
    });
  }

  // Allowed languages
  if (rules.allowedLanguages.length > 0) {
    for (const lang of codeLanguagesUsed) {
      if (!rules.allowedLanguages.includes(lang)) {
        errors.push({
          field: 'content',
          message: `Code block uses disallowed language: ${lang}. Allowed: ${rules.allowedLanguages.join(', ')}`,
          code: 'DISALLOWED_CODE_LANGUAGE',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// MODULE STRUCTURE VALIDATION
// ========================================

export function validateModuleStructure(
  lessonCount: number,
  hasQuiz: boolean,
  rules: ModuleRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (lessonCount < rules.minLessons) {
    errors.push({
      field: 'lessons',
      message: `Module must have at least ${rules.minLessons} lesson(s), found ${lessonCount}`,
      code: 'MIN_LESSONS',
    });
  }
  if (lessonCount > rules.maxLessons) {
    errors.push({
      field: 'lessons',
      message: `Module must have at most ${rules.maxLessons} lesson(s), found ${lessonCount}`,
      code: 'MAX_LESSONS',
    });
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// QUIZ VALIDATION
// ========================================

export function validateQuizForm(
  quizForm: unknown,
  rules: QuizRules,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!quizForm || typeof quizForm !== 'object' || Array.isArray(quizForm)) {
    return {
      valid: false,
      errors: [{ field: 'quiz_form', message: 'quiz_form must be a non-null object', code: 'INVALID_TYPE' }],
    };
  }

  const quiz = quizForm as Record<string, unknown>;

  for (const field of rules.requiredFields) {
    if (!(field in quiz)) {
      errors.push({
        field: `quiz_form.${field}`,
        message: `Missing required field: ${field}`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  if (typeof quiz.passingScore === 'number') {
    if (quiz.passingScore < rules.minPassingScore) {
      errors.push({ field: 'quiz_form.passingScore', message: `passingScore must be at least ${rules.minPassingScore}`, code: 'MIN_PASSING_SCORE' });
    }
    if (quiz.passingScore > rules.maxPassingScore) {
      errors.push({ field: 'quiz_form.passingScore', message: `passingScore must be at most ${rules.maxPassingScore}`, code: 'MAX_PASSING_SCORE' });
    }
  }

  if (!Array.isArray(quiz.questions)) {
    if ('questions' in quiz) {
      errors.push({ field: 'quiz_form.questions', message: 'questions must be an array', code: 'INVALID_QUESTIONS_TYPE' });
    }
    return { valid: errors.length === 0, errors };
  }

  const questions = quiz.questions as Record<string, unknown>[];

  if (questions.length < rules.minQuestions) {
    errors.push({ field: 'quiz_form.questions', message: `Must have at least ${rules.minQuestions} question(s), found ${questions.length}`, code: 'MIN_QUESTIONS' });
  }
  if (questions.length > rules.maxQuestions) {
    errors.push({ field: 'quiz_form.questions', message: `Must have at most ${rules.maxQuestions} question(s), found ${questions.length}`, code: 'MAX_QUESTIONS' });
  }

  const seenIds = new Set<string>();
  questions.forEach((q, i) => {
    for (const field of rules.requiredQuestionFields) {
      if (!(field in q)) {
        errors.push({ field: `quiz_form.questions[${i}].${field}`, message: `Question ${i + 1} is missing required field: ${field}`, code: 'MISSING_QUESTION_FIELD' });
      }
    }
    if (typeof q.id === 'string') {
      if (seenIds.has(q.id)) {
        errors.push({ field: `quiz_form.questions[${i}].id`, message: `Duplicate question ID: ${q.id}`, code: 'DUPLICATE_QUESTION_ID' });
      }
      seenIds.add(q.id);
    }
    if (Array.isArray(q.options) && q.options.length !== rules.optionsPerQuestion) {
      errors.push({ field: `quiz_form.questions[${i}].options`, message: `Question ${i + 1} must have exactly ${rules.optionsPerQuestion} options, found ${q.options.length}`, code: 'INVALID_OPTION_COUNT' });
    }
    if (typeof q.correctOption === 'string' && !rules.validCorrectOptions.includes(q.correctOption)) {
      errors.push({ field: `quiz_form.questions[${i}].correctOption`, message: `Question ${i + 1} has invalid correctOption: ${q.correctOption}`, code: 'INVALID_CORRECT_OPTION' });
    }
  });

  return { valid: errors.length === 0, errors };
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errors (the new file doesn't import anything that breaks). If there are errors in other files, note them — they'll be fixed in Tasks 3-5.

**Step 3: Commit**

```bash
git add app/src/lib/content-schema.ts
git commit -m "feat: add content-schema.ts with lesson, module, and quiz validation"
```

---

### Task 3: Update `data.ts` — remove `mdx_content` / `schema_version`

**Files:**
- Modify: `app/src/lib/data.ts`

**Context:** Four SQL queries select `mdx_content` and `schema_version` from `modules`:
- `getCoursesWithModules()` (line ~114)
- `getCourseWithModules()` (line ~153)
- `getModule()` (line ~180)
- `getCoursesForSidebar()` (line ~811)

Also: `Module` interface (line ~39), `deriveContentItems()` (line ~65), `getLesson()` fallback path (line ~235), `getLessonCount()` fallback (line ~270).

**Step 1: Update `Module` interface**

Remove `mdx_content` and `schema_version` fields:

```typescript
export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order: number;
  quiz_form: QuizForm | null;
  lesson_count: number;
}
```

**Step 2: Update `deriveContentItems()`**

Remove `getMdxSectionTitles` usage — use generic titles (real titles come from the `lessons` table when needed):

```typescript
function deriveContentItems(m: Module): ContentItem[] {
  const items: ContentItem[] = [];
  for (let i = 0; i < m.lesson_count; i++) {
    items.push({ type: 'lesson', index: i, title: `Lesson ${i + 1}` });
  }
  if (m.quiz_form) {
    items.push({ type: 'quiz', index: -1, title: m.quiz_form.title || 'Quiz' });
  }
  return items;
}
```

**Step 3: Update all four SQL queries — remove `mdx_content, schema_version`**

In `getCoursesWithModules`, `getCourseWithModules`, `getModule`, `getCoursesForSidebar`, change:
```sql
SELECT id, course_id, title, description, "order",
       mdx_content, lesson_count, quiz_form, schema_version
FROM modules
```
to:
```sql
SELECT id, course_id, title, description, "order",
       lesson_count, quiz_form
FROM modules
```

**Step 4: Remove `getLesson()` fallback path**

The fallback at lines ~235-251 assumes `mdx_content` exists. Delete the entire fallback block:

```typescript
export async function getLesson(
  moduleId: string,
  position: number
): Promise<LessonData | null> {
  const lessonIndex = position - 1;

  try {
    const result = await sql`
      SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
             m.id AS module_id, m.title AS module_title
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.module_id = ${moduleId}
        AND l.lesson_index = ${lessonIndex}
    `;

    if (result.length === 0) return null;

    const row = result[0] as any;
    return {
      id: row.id,
      lessonIndex: row.lesson_index,
      content: row.content,
      title: row.title,
      codeTemplate: row.code_template ?? null,
      moduleId: row.module_id,
      moduleTitle: row.module_title,
    };
  } catch (error) {
    console.error('getLesson error:', error);
    return null;
  }
}
```

**Step 5: Simplify `getLessonCount()`**

Remove the fallback to `lesson_count` column (it's still there but now just returns the module's `lesson_count` if the lessons table query fails — keep the fallback since the column still exists on `modules`). No change needed here; just confirm it still works.

**Step 6: Remove `getMdxSectionTitles` import from top of file**

Delete line:
```typescript
import { getMdxSectionTitles } from '@/lib/mdx-utils';
```

**Step 7: Type-check**

```bash
cd app && npx tsc --noEmit
```

Fix any errors before proceeding.

**Step 8: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "refactor: remove mdx_content and schema_version from Module type and queries"
```

---

### Task 4: Update `detail/route.ts` — query lesson titles from DB

**Files:**
- Modify: `app/src/app/api/courses/[courseId]/detail/route.ts`

**Context:** Line 47-49 falls back to `getMdxSectionTitles(m.mdx_content)` when titles aren't available. With `mdx_content` dropped, this path is gone. Lesson titles must come from the `lessons` table.

**Step 1: Remove `getMdxSectionTitles` import**

Delete:
```typescript
import { getMdxSectionTitles } from '@/lib/mdx-utils';
```

**Step 2: Add a lesson titles query**

Before building `moduleDetails`, add a batch query to get all lesson titles for the course's modules:

```typescript
// Fetch lesson titles for all modules in one query
const lessonRows = await sql`
  SELECT module_id, lesson_index, title
  FROM lessons
  WHERE module_id = ANY(${course.modules.map((m) => m.id)})
  ORDER BY module_id, lesson_index ASC
`;

const lessonTitlesByModule = new Map<string, string[]>();
for (const row of lessonRows as any[]) {
  if (!lessonTitlesByModule.has(row.module_id)) {
    lessonTitlesByModule.set(row.module_id, []);
  }
  lessonTitlesByModule.get(row.module_id)!.push(row.title);
}
```

**Step 3: Update `moduleDetails` mapping to use the new titles map**

Replace:
```typescript
const lessonTitles = m.mdx_content
  ? getMdxSectionTitles(m.mdx_content)
  : Array.from({ length: m.lesson_count }, (_, i) => `Lesson ${i + 1}`);
```

With:
```typescript
const lessonTitles = lessonTitlesByModule.get(m.id)
  ?? Array.from({ length: m.lesson_count }, (_, i) => `Lesson ${i + 1}`);
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add app/src/app/api/courses/[courseId]/detail/route.ts
git commit -m "refactor: query lesson titles from DB in detail route"
```

---

### Task 5: Delete `module-schema.ts` and clean up `mdx-utils.ts`

**Files:**
- Delete: `app/src/lib/module-schema.ts`
- Modify: `app/src/lib/mdx-utils.ts`

**Step 1: Check nothing still imports `module-schema.ts`**

```bash
grep -r "module-schema" app/src --include="*.ts" --include="*.tsx"
```

Expected: no output. If anything shows up, update those imports to use `content-schema.ts` equivalents before deleting.

**Step 2: Delete `module-schema.ts`**

```bash
rm app/src/lib/module-schema.ts
```

**Step 3: Check what still imports from `mdx-utils.ts`**

```bash
grep -r "mdx-utils" app/src --include="*.ts" --include="*.tsx"
```

Expected: nothing after Tasks 3 and 4. If `getMdxSectionTitle` or `getMdxSectionTitles` are still imported somewhere, handle those first.

**Step 4: Remove unused functions from `mdx-utils.ts`**

`splitMdxSections` and `getMdxSection` are no longer called anywhere. Remove them. Keep `getMdxSectionTitle` and `getMdxSectionTitles` only if still referenced; otherwise delete the entire file.

If the file becomes empty (or only has unreferenced exports), delete it:
```bash
rm app/src/lib/mdx-utils.ts
```

**Step 5: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add -u app/src/lib/module-schema.ts app/src/lib/mdx-utils.ts
git commit -m "chore: delete module-schema.ts and unused mdx-utils functions"
```

---

### Task 6: Smoke test

**Step 1: Start the dev server**

```bash
cd app && npm run dev -- -p 5050
```

**Step 2: Verify lesson pages load**

Open `http://localhost:5050/dashboard` — sign in if redirected.
Navigate to a course lesson. Confirm:
- Lesson content renders
- Lesson title shows (from `lessons.title` in DB)
- "Mark as Complete" works

**Step 3: Verify quiz page loads**

Navigate to a quiz. Confirm:
- Quiz renders with questions
- Submit works and records attempt

**Step 4: Verify course overview dialog**

Open the course overview dialog from the dashboard. Confirm lesson titles appear correctly (not generic fallbacks).

**Step 5: Final type check**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 errors.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verify content-schema migration complete"
```
