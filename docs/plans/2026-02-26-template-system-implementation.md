# Template System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the typed template system — `lesson_sections` DB table, Zod validation engine, template component library, and LLM-ready JSON Schema utility — so lesson content is structured, validated, and rendered from typed templates instead of raw Markdown splitting.

**Architecture:** TypeScript template schemas in `src/lib/templates/` define Zod schemas (server-safe). React components in `src/components/templates/` define rendering. Content is stored as JSONB in `lesson_sections` (normalized table) and as JSONB intro/outro columns on `lessons`, `modules`, `courses`. A mapped-type component registry enforces that every schema has a component at compile time.

**Tech Stack:** Next.js 15 App Router, Neon Postgres (raw SQL via `@neondatabase/serverless`), Zod, `zod-to-json-schema`, Tailwind CSS v4, TypeScript strict mode.

**Design doc:** `docs/plans/2026-02-26-template-system-design.md`

---

## Context: Existing Patterns to Follow

- DB IDs are `TEXT` (UUIDs as strings), not `UUID` type — match this in new table
- Migrations are plain `.sql` files in `app/migrations/` — run manually against Neon, wrap in `BEGIN`/`COMMIT`
- Data fetching: raw SQL via `` sql`...` `` from `@/lib/neon`, wrapped in `React.cache()` for Server Components
- Seed script: `app/scripts/seed-content.mjs` — ESM, top-level `await`, reads `DATABASE_URL` from `app/.env.local`
- Type check: `cd app && npx tsc --noEmit` — run this after every TypeScript task
- No unit test framework — verification is type checking + `npm run build`

---

## Task 1: DB Migration — `lesson_sections` table + intro/outro columns

**Files:**
- Create: `app/migrations/2026-02-26-template-system.sql`

**Step 1: Write the migration file**

```sql
-- Migration: Template system — lesson_sections table + intro/outro JSONB columns
-- Date: 2026-02-26
-- Safe: all new additions, no destructive changes. Run seed after.

BEGIN;

-- 1. lesson_sections table (replaces content TEXT splitting)
CREATE TABLE lesson_sections (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  template    TEXT NOT NULL,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, position),
  CHECK (position >= 0),
  CHECK (jsonb_typeof(content) = 'object'),
  CHECK (template IN ('code-section', 'prose-section', 'challenge-section'))
);

-- 2. Lesson intro/outro
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE lessons
  ADD CONSTRAINT IF NOT EXISTS lessons_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS lessons_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- 3. Module intro/outro
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE modules
  ADD CONSTRAINT IF NOT EXISTS modules_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS modules_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- 4. Course intro/outro
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS intro_content JSONB,
  ADD COLUMN IF NOT EXISTS outro_content JSONB;

ALTER TABLE courses
  ADD CONSTRAINT IF NOT EXISTS courses_intro_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS courses_outro_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

COMMIT;
```

**Step 2: Run the migration against Neon**

```bash
# From repo root — paste contents into Neon SQL editor, or run via psql:
psql $DATABASE_URL -f app/migrations/2026-02-26-template-system.sql
```

Expected: no errors, `CREATE TABLE`, and multiple `ALTER TABLE` outputs.

**Step 3: Verify table exists**

```bash
psql $DATABASE_URL -c "\d lesson_sections"
```

Expected: shows `id`, `lesson_id`, `position`, `template`, `content`, `created_at` columns.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-26-template-system.sql
git commit -m "feat: add lesson_sections table and intro/outro JSONB columns"
```

---

## Task 2: Install `zod-to-json-schema`

**Files:**
- Modify: `app/package.json` (via npm install)

**Step 1: Install the package**

```bash
cd app && npm install zod-to-json-schema
```

**Step 2: Verify it resolves**

```bash
cd app && node -e "import('zod-to-json-schema').then(m => console.log('ok', Object.keys(m)))"
```

Expected: prints `ok [ 'zodToJsonSchema', ... ]`

**Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "feat: install zod-to-json-schema for LLM structured output"
```

---

## Task 3: Template schemas

**Files:**
- Create: `app/src/lib/templates/schemas.ts`

This file is **server-safe** — no React imports, no client-only code. It can be imported in API routes, seed scripts, and Server Components.

**Step 1: Create `app/src/lib/templates/schemas.ts`**

```ts
import { z } from 'zod';

export const schemas = {
  // ── Lesson level ─────────────────────────────────────────────────────────
  'lesson-intro': z.object({
    hook: z
      .string()
      .min(1)
      .describe('Opening sentence that frames why this lesson matters.'),
    outcomes: z
      .array(z.string().min(1))
      .min(1)
      .describe('What the learner will be able to do after this lesson.'),
    estimated_minutes: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Estimated completion time in minutes.'),
  }),

  'lesson-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('2–3 sentence summary of what was covered.'),
    next_lesson_teaser: z
      .string()
      .optional()
      .describe('One sentence previewing what comes next.'),
  }),

  // ── Lesson sections ───────────────────────────────────────────────────────
  'code-section': z.object({
    explanation: z
      .string()
      .min(1)
      .describe('Prose explanation of the concept, shown before the code. 2–4 sentences.'),
    code: z
      .string()
      .min(1)
      .describe('Python code example. Should be complete and runnable.'),
    language: z
      .string()
      .default('python')
      .describe('Language identifier for syntax highlighting. Default: python.'),
    takeaway: z
      .string()
      .optional()
      .describe('One-sentence summary of what the learner should remember.'),
  }),

  'prose-section': z.object({
    markdown: z
      .string()
      .min(1)
      .describe('Markdown content for a text-only section.'),
  }),

  'challenge-section': z.object({
    // challenge-section has no JSONB content — it renders from the lesson's
    // existing problem_summary, problem_constraints, problem_hints fields.
    // This schema is a sentinel so the template registry stays complete.
    _type: z.literal('challenge').default('challenge'),
  }),

  // ── Module level ──────────────────────────────────────────────────────────
  'module-intro': z.object({
    title: z.string().min(1).describe('Module title.'),
    description: z
      .string()
      .min(1)
      .describe('What this module covers. 2–3 sentences.'),
    what_you_learn: z
      .array(z.string().min(1))
      .min(1)
      .describe('Bullet list of learning outcomes for the module.'),
  }),

  'module-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('Summary of what the module covered.'),
    next_module: z
      .string()
      .optional()
      .describe('Name or teaser of the next module.'),
  }),

  // ── Course level ──────────────────────────────────────────────────────────
  'course-intro': z.object({
    hook: z.string().min(1).describe('Opening hook for the course.'),
    outcomes: z
      .array(z.string().min(1))
      .min(1)
      .describe('High-level outcomes for the full course.'),
    who_is_this_for: z
      .string()
      .optional()
      .describe('Target audience description.'),
  }),

  'course-outro': z.object({
    recap: z
      .string()
      .min(1)
      .describe('Summary of the full course journey.'),
    certificate_info: z
      .string()
      .optional()
      .describe('Info about any certificate or credential earned.'),
  }),
} as const;

export type TemplateName = keyof typeof schemas;
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/src/lib/templates/schemas.ts
git commit -m "feat: add template Zod schemas with .describe() for LLM context"
```

---

## Task 4: Validation engine + types + JSON Schema utility

**Files:**
- Create: `app/src/lib/templates/validate.ts`
- Create: `app/src/lib/templates/types.ts`
- Create: `app/src/lib/templates/json-schema.ts`

**Step 1: Create `app/src/lib/templates/types.ts`**

```ts
import type { z } from 'zod';
import type { schemas, TemplateName } from './schemas';

/** Infer the content type for any template name. Never hand-write these. */
export type TemplateContent<T extends TemplateName> = z.infer<typeof schemas[T]>;
```

**Step 2: Create `app/src/lib/templates/validate.ts`**

```ts
import { z } from 'zod';
import { schemas, type TemplateName } from './schemas';
import type { TemplateContent } from './types';

export type ValidationResult<T extends TemplateName> =
  | { success: true; data: TemplateContent<T> }
  | { success: false; error: z.ZodError };

/**
 * Validate content against its template schema.
 * Returns a result object — caller decides how to handle failure.
 * Use in API routes.
 */
export function validateContent<T extends TemplateName>(
  template: T,
  content: unknown,
): ValidationResult<T> {
  const result = schemas[template].safeParse(content);
  if (result.success) {
    return { success: true, data: result.data as TemplateContent<T> };
  }
  return { success: false, error: result.error };
}

/**
 * Assert that content is valid against its template schema.
 * Throws a ZodError on invalid input.
 * Use in seed scripts where failure should be loud and immediate.
 */
export function assertValidContent<T extends TemplateName>(
  template: T,
  content: unknown,
): TemplateContent<T> {
  return schemas[template].parse(content) as TemplateContent<T>;
}
```

**Step 3: Create `app/src/lib/templates/json-schema.ts`**

```ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { schemas, type TemplateName } from './schemas';

/**
 * Convert a template's Zod schema to JSON Schema format.
 * Pass the result as `response_format.json_schema` in LLM API calls
 * to constrain the model's output to valid template content.
 *
 * The .describe() annotations on each field are included as JSON Schema
 * `description` properties — they serve as per-field instructions for the LLM.
 */
export function getJsonSchemaForTemplate(template: TemplateName): object {
  return zodToJsonSchema(schemas[template], { name: template });
}
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/src/lib/templates/
git commit -m "feat: add template validation engine, types, and JSON Schema utility"
```

---

## Task 5: Update `data.ts` — add `LessonSection` type + `getLessonSections()`

**Files:**
- Modify: `app/src/lib/data.ts`

The lesson player needs to fetch `lesson_sections` rows for a given lesson ID. Also add `introContent`/`outroContent` to `LessonData`.

**Step 1: Add `DbLessonSection` type and `getLessonSections()` to `data.ts`**

Add after the `UserCode` interface (around line 63):

```ts
// ── Template system ──────────────────────────────────────────────────────────

export interface DbLessonSection {
  id: string;
  lessonId: string;
  position: number;
  template: string;        // TemplateName — kept as string here to avoid server bundle coupling
  content: unknown;        // Validated JSONB; cast to TemplateContent<T> at render time
}

/**
 * Fetch all sections for a lesson, ordered by position.
 * Wrapped with React.cache() for per-request deduplication.
 */
export const getLessonSections = cache(async (lessonId: string): Promise<DbLessonSection[]> => {
  try {
    const result = await sql`
      SELECT id, lesson_id, position, template, content
      FROM lesson_sections
      WHERE lesson_id = ${lessonId}
      ORDER BY position ASC
    `;
    return (result as any[]).map((row) => ({
      id: row.id,
      lessonId: row.lesson_id,
      position: row.position,
      template: row.template,
      content: row.content,
    }));
  } catch (error) {
    console.error('getLessonSections error:', error);
    return [];
  }
});
```

**Step 2: Add `introContent` and `outroContent` to `LessonData` interface**

Find the `LessonData` interface (around line 164) and add two fields:

```ts
export interface LessonData {
  id: string;
  lessonIndex: number;
  content: string;             // deprecated — kept for transition period
  title: string;
  codeTemplate: string | null;
  testCases: TestCase[] | null;
  entryPoint: string | null;
  solutionCode: string | null;
  moduleId: string;
  moduleTitle: string;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  introContent: unknown | null;   // LessonIntroContent if present
  outroContent: unknown | null;   // LessonOutroContent if present
}
```

**Step 3: Update `getLesson()` SQL query to include `intro_content` and `outro_content`**

Find the SELECT inside `getLesson()` and add the two columns:

```ts
const result = await sql`
  SELECT l.id, l.lesson_index, l.title, l.content, l.code_template,
         l.entry_point, l.solution_code,
         l.problem_summary, l.problem_constraints, l.problem_hints,
         l.intro_content, l.outro_content,
         COALESCE(
           (SELECT json_agg(
              json_build_object('description', tc.description, 'args', tc.args,
                                'expected', tc.expected, 'visible', tc.visible)
              ORDER BY tc.position
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

And add the fields to the return object:

```ts
return {
  // ... existing fields ...
  introContent: row.intro_content ?? null,
  outroContent: row.outro_content ?? null,
};
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: add DbLessonSection type, getLessonSections(), introContent/outroContent to LessonData"
```

---

## Task 6: Template components

**Files:**
- Create: `app/src/components/templates/lesson-intro.tsx`
- Create: `app/src/components/templates/lesson-outro.tsx`
- Create: `app/src/components/templates/code-section.tsx`
- Create: `app/src/components/templates/prose-section.tsx`
- Create: `app/src/components/templates/module-intro.tsx`
- Create: `app/src/components/templates/module-outro.tsx`
- Create: `app/src/components/templates/course-intro.tsx`
- Create: `app/src/components/templates/course-outro.tsx`

All components are `'use client'` (they live in the lesson player, a client tree). Each receives its typed `content` prop.

**Step 1: Create `lesson-intro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-intro'>;
}

export function LessonIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-foreground/80 leading-relaxed">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll learn
        </p>
        <ul className="flex flex-col gap-2">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-primary" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.estimated_minutes && (
        <p className="text-xs text-muted-foreground/40 font-mono">
          ~{content.estimated_minutes} min
        </p>
      )}
    </div>
  );
}
```

**Step 2: Create `lesson-outro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'lesson-outro'>;
}

export function LessonOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>

      {content.next_lesson_teaser && (
        <div className="border-l-2 border-primary/30 pl-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
            Up next
          </p>
          <p className="text-sm text-foreground/60">{content.next_lesson_teaser}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create `code-section.tsx`**

```tsx
'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'code-section'>;
}

export function CodeSectionTemplate({ content }: Props) {
  const fenced = `\`\`\`${content.language}\n${content.code}\n\`\`\``;

  return (
    <div className="flex flex-col gap-4">
      <div className="prose-container">
        <Markdown content={content.explanation} />
      </div>

      <div className="prose-container">
        <Markdown content={fenced} />
      </div>

      {content.takeaway && (
        <p className="text-sm text-muted-foreground/60 italic border-t border-border/20 pt-4">
          {content.takeaway}
        </p>
      )}
    </div>
  );
}
```

**Step 4: Create `prose-section.tsx`**

```tsx
'use client';

import { Markdown } from '@/components/shared/markdown';
import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'prose-section'>;
}

export function ProseSectionTemplate({ content }: Props) {
  return (
    <div className="prose-container">
      <Markdown content={content.markdown} />
    </div>
  );
}
```

**Step 5: Create `module-intro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-intro'>;
}

export function ModuleIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{content.title}</h2>
        <p className="mt-2 text-foreground/70 leading-relaxed">{content.description}</p>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          In this module
        </p>
        <ul className="flex flex-col gap-2">
          {content.what_you_learn.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

**Step 6: Create `module-outro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'module-outro'>;
}

export function ModuleOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>
      {content.next_module && (
        <div className="border-l-2 border-primary/30 pl-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">
            Coming up
          </p>
          <p className="text-sm text-foreground/60">{content.next_module}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 7: Create `course-intro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-intro'>;
}

export function CourseIntroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-foreground/80 leading-relaxed">{content.hook}</p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">
          What you&apos;ll achieve
        </p>
        <ul className="flex flex-col gap-2">
          {content.outcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-primary" />
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {content.who_is_this_for && (
        <p className="text-sm text-muted-foreground/50">
          {content.who_is_this_for}
        </p>
      )}
    </div>
  );
}
```

**Step 8: Create `course-outro.tsx`**

```tsx
'use client';

import type { TemplateContent } from '@/lib/templates/types';

interface Props {
  content: TemplateContent<'course-outro'>;
}

export function CourseOutroTemplate({ content }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/80 leading-relaxed">{content.recap}</p>
      {content.certificate_info && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground/70">{content.certificate_info}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 9: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 10: Commit**

```bash
git add app/src/components/templates/
git commit -m "feat: add template components for all 8 template types"
```

---

## Task 7: Component registry with compile-time coverage enforcement

**Files:**
- Create: `app/src/components/templates/index.ts`

**Step 1: Create the registry**

```ts
'use client';

import type { ComponentType } from 'react';
import type { TemplateName, TemplateContent } from '@/lib/templates/types';

import { LessonIntroTemplate } from './lesson-intro';
import { LessonOutroTemplate } from './lesson-outro';
import { CodeSectionTemplate } from './code-section';
import { ProseSectionTemplate } from './prose-section';
import { ModuleIntroTemplate } from './module-intro';
import { ModuleOutroTemplate } from './module-outro';
import { CourseIntroTemplate } from './course-intro';
import { CourseOutroTemplate } from './course-outro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateComponentMap = { [K in TemplateName]: ComponentType<{ content: TemplateContent<K> }> };

/**
 * Maps every template name to its React component.
 * TypeScript errors here if any template in schemas.ts lacks a component.
 * Adding a template = add to schemas.ts + add a component file + add entry here.
 */
export const templateComponents: TemplateComponentMap = {
  'lesson-intro':       LessonIntroTemplate,
  'lesson-outro':       LessonOutroTemplate,
  'code-section':       CodeSectionTemplate,
  'prose-section':      ProseSectionTemplate,
  'challenge-section':  ProseSectionTemplate, // sentinel — LessonSections handles challenge specially
  'module-intro':       ModuleIntroTemplate,
  'module-outro':       ModuleOutroTemplate,
  'course-intro':       CourseIntroTemplate,
  'course-outro':       CourseOutroTemplate,
};

/** Render a section's content using its registered component. */
export function renderTemplate(template: TemplateName, content: unknown): React.ReactNode {
  const Component = templateComponents[template] as ComponentType<{ content: unknown }>;
  return <Component content={content} />;
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about a missing template name, add the component.

**Step 3: Commit**

```bash
git add app/src/components/templates/index.ts
git commit -m "feat: add template component registry with compile-time coverage enforcement"
```

---

## Task 8: Rewrite `LessonSections` to render from DB sections + templates

**Files:**
- Modify: `app/src/components/lesson/lesson-sections.tsx`

The component currently receives `LessonSection[]` from `parseLessonSections()`. It now receives `DbLessonSection[]` from the DB plus `introContent`/`outroContent`.

**Step 1: Rewrite `lesson-sections.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import { renderTemplate } from '@/components/templates';
import type { DbLessonSection } from '@/lib/data';
import type { TemplateName } from '@/lib/templates/schemas';
import type { TestCase } from '@/lib/judge0';

interface LessonSectionsProps {
  introContent: unknown | null;
  sections: DbLessonSection[];
  outroContent: unknown | null;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

type NavItem =
  | { kind: 'intro' }
  | { kind: 'section'; section: DbLessonSection }
  | { kind: 'outro' }
  | { kind: 'challenge' };

export function LessonSections({
  introContent,
  sections,
  outroContent,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: LessonSectionsProps) {
  // Build ordered nav items
  const navItems: NavItem[] = [];
  if (introContent !== null) navItems.push({ kind: 'intro' });
  for (const section of sections) navItems.push({ kind: 'section', section });
  if (outroContent !== null) navItems.push({ kind: 'outro' });
  if (problemSummary) navItems.push({ kind: 'challenge' });

  const [activeIndex, setActiveIndex] = useState(0);

  const navigateTo = (index: number) => {
    if (index < 0 || index >= navItems.length || index === activeIndex) return;
    setActiveIndex(index);
  };

  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= navItems.length - 1;
  const active = navItems[activeIndex];

  function dotLabel(item: NavItem, i: number): string {
    if (item.kind === 'intro') return 'Intro';
    if (item.kind === 'outro') return 'Outro';
    if (item.kind === 'challenge') return 'Challenge';
    return `Section ${i + 1}`;
  }

  function renderActive(item: NavItem) {
    if (item.kind === 'intro') {
      return renderTemplate('lesson-intro', introContent);
    }
    if (item.kind === 'outro') {
      return renderTemplate('lesson-outro', outroContent);
    }
    if (item.kind === 'challenge') {
      return problemSummary ? (
        <ProblemPanel
          problemSummary={problemSummary}
          problemConstraints={problemConstraints}
          problemHints={problemHints}
          testCases={testCases}
          entryPoint={entryPoint}
        />
      ) : null;
    }
    // section
    return renderTemplate(item.section.template as TemplateName, item.section.content);
  }

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col">
      {/* Up arrow */}
      <button
        onClick={() => navigateTo(activeIndex - 1)}
        disabled={isFirst}
        aria-label="Previous section"
        className={cn(
          'shrink-0 h-8 w-full flex items-center justify-center',
          'text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-200',
          isFirst ? 'opacity-0 pointer-events-none' : '',
        )}
      >
        <ChevronUp className="w-5 h-5 stroke-[1.5]" />
      </button>

      {/* Middle: dots + content */}
      <div className="flex-1 min-h-0 relative">
        {/* Dots */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => navigateTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                activeIndex === i
                  ? 'w-1.5 h-5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
              )}
              title={dotLabel(item, i)}
            />
          ))}
        </div>

        {/* Content */}
        {active && (
          <div className="absolute inset-0 overflow-y-auto px-8 pt-8 pb-12">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                {active.kind === 'intro'
                  ? 'intro'
                  : active.kind === 'outro'
                  ? 'outro'
                  : active.kind === 'challenge'
                  ? 'challenge'
                  : String(activeIndex + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 h-px bg-border/20" />
            </div>

            {renderActive(active)}
          </div>
        )}
      </div>

      {/* Down arrow */}
      <button
        onClick={() => navigateTo(activeIndex + 1)}
        disabled={isLast}
        aria-label="Next section"
        className={cn(
          'shrink-0 h-8 w-full flex items-center justify-center',
          'text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-200',
          isLast ? 'opacity-0 pointer-events-none' : '',
        )}
      >
        <ChevronDown className="w-5 h-5 stroke-[1.5]" />
      </button>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/lesson/lesson-sections.tsx
git commit -m "feat: rewrite LessonSections to render from DbLessonSection[] with template dispatch"
```

---

## Task 9: Update `CodeLessonLayout` to accept structured sections

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`

Replace `content: string` + `parseLessonSections()` call with `introContent`, `sections`, `outroContent`.

**Step 1: Update the props interface**

Remove `content: string`. Add:

```ts
interface CodeLessonLayoutProps {
  lessonTitle: string;
  introContent: unknown | null;      // add
  sections: DbLessonSection[];       // add
  outroContent: unknown | null;      // add
  codeTemplate: string | null;
  // ... rest unchanged
}
```

Import `DbLessonSection` from `@/lib/data`.

**Step 2: Remove `parseLessonSections` usage**

Delete the import of `parseLessonSections` and `parse-lesson-sections`. Remove the call that was:

```ts
const sections = parseLessonSections(content, problemSummary);
```

**Step 3: Pass new props to `LessonSections`**

```tsx
<LessonSections
  introContent={introContent}
  sections={sections}
  outroContent={outroContent}
  problemSummary={problemSummary}
  problemConstraints={problemConstraints}
  problemHints={problemHints}
  testCases={testCases}
  entryPoint={entryPoint}
/>
```

**Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

Fix any type errors — the compiler will guide you.

**Step 5: Commit**

```bash
git add app/src/components/lesson/code-lesson-layout.tsx
git commit -m "feat: update CodeLessonLayout to accept structured sections instead of raw content string"
```

---

## Task 10: Update the real lesson page Server Component

**Files:**
- Modify: `app/src/app/dashboard/course/[courseId]/[moduleId]/lesson/[order]/page.tsx`

This Server Component calls `getLesson()`. Now it also needs to call `getLessonSections()` and pass the results to `CodeLessonLayout`.

**Step 1: Add `getLessonSections` import and call**

```ts
import { getLesson, getLessonSections } from '@/lib/data';

// Inside the page component, after getLesson():
const lesson = await getLesson(moduleId, order);
if (!lesson) notFound();

const sections = await getLessonSections(lesson.id);
```

**Step 2: Pass new props to `CodeLessonLayout`**

```tsx
<CodeLessonLayout
  lessonTitle={lesson.title}
  introContent={lesson.introContent}
  sections={sections}
  outroContent={lesson.outroContent}
  // ... rest of existing props
/>
```

**Step 3: Type-check + build**

```bash
cd app && npx tsc --noEmit && npm run build
```

Expected: no type errors, build succeeds (may have warnings about empty sections — that's fine).

**Step 4: Commit**

```bash
git add app/src/app/dashboard/
git commit -m "feat: update lesson page to fetch and pass structured sections to CodeLessonLayout"
```

---

## Task 11: Update mock-course page with structured mock data

**Files:**
- Modify: `app/src/app/mock-course/page.tsx`
- Modify: `app/src/mock-data/mock-lesson.md` → effectively replaced by inline mock data

The mock-course page currently reads a markdown file and passes it to `SlidesPaneLoader`. Now it passes structured mock sections to `LessonSections` directly (no DB needed, dev-only page).

**Step 1: Rewrite `mock-course/page.tsx`**

```tsx
/**
 * DEVELOPMENT ONLY — delete before shipping.
 * Renders a mock lesson using structured template data (no DB, no auth).
 * Visit: http://localhost:3000/mock-course
 */

import { LessonSections } from '@/components/lesson/lesson-sections';
import type { DbLessonSection } from '@/lib/data';

const MOCK_INTRO = {
  hook: 'Python lists are the workhorse of everyday programming — once you understand how to slice, dice, and iterate them, you can solve almost any data problem.',
  outcomes: [
    'Create and index Python lists',
    'Use slicing to extract sublists',
    'Iterate with for loops and list comprehensions',
  ],
  estimated_minutes: 12,
};

const MOCK_SECTIONS: DbLessonSection[] = [
  {
    id: 'mock-1',
    lessonId: 'mock-lesson',
    position: 0,
    template: 'prose-section',
    content: {
      markdown: `## What is a list?\n\nA list is an ordered, mutable sequence of values. You create one with square brackets:\n\n\`\`\`python\nfruits = ["apple", "banana", "cherry"]\n\`\`\`\n\nLists can hold any type — numbers, strings, even other lists.`,
    },
  },
  {
    id: 'mock-2',
    lessonId: 'mock-lesson',
    position: 1,
    template: 'code-section',
    content: {
      explanation: 'Indexing lets you access individual elements. Python uses zero-based indexing — the first element is at index 0. Negative indices count from the end.',
      code: `fruits = ["apple", "banana", "cherry"]\n\nprint(fruits[0])   # apple\nprint(fruits[-1])  # cherry`,
      language: 'python',
      takeaway: 'Index from 0 forward, or from -1 backward.',
    },
  },
  {
    id: 'mock-3',
    lessonId: 'mock-lesson',
    position: 2,
    template: 'code-section',
    content: {
      explanation: 'Slicing extracts a sublist using start:stop notation. The stop index is exclusive — fruits[0:2] gives you the first two elements.',
      code: `fruits = ["apple", "banana", "cherry", "date"]\n\nprint(fruits[1:3])   # ['banana', 'cherry']\nprint(fruits[:2])    # ['apple', 'banana']\nprint(fruits[2:])    # ['cherry', 'date']`,
      language: 'python',
      takeaway: 'Slice with [start:stop] — stop is not included.',
    },
  },
];

const MOCK_OUTRO = {
  recap: 'You can now create lists, access elements by index, and slice sublists. These three operations form the foundation of list manipulation in Python.',
  next_lesson_teaser: 'Next up: modifying lists — append, insert, remove, and pop.',
};

export default function MockCoursePage() {
  return (
    <div className="h-svh flex flex-col bg-background text-foreground overflow-hidden">
      <header className="shrink-0 h-10 flex items-center px-4 border-b border-border/50 bg-background/95">
        <span className="font-mono text-xs text-muted-foreground/40 uppercase tracking-wider">
          mock-course · template system smoke-test
        </span>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Lesson prose pane */}
        <div className="w-1/2 border-r border-border/50 flex">
          <LessonSections
            introContent={MOCK_INTRO}
            sections={MOCK_SECTIONS}
            outroContent={MOCK_OUTRO}
            problemSummary={null}
            problemConstraints={[]}
            problemHints={[]}
            testCases={null}
            entryPoint={null}
          />
        </div>

        {/* Placeholder right pane */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center">
          <span className="font-mono text-zinc-600 text-sm">code editor placeholder</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Start the dev server and verify**

```bash
cd app && npm run dev
```

Navigate to `http://localhost:3000/mock-course`. Verify:
- Intro slide renders with hook + outcomes + estimated time
- Dot navigation shows 5 dots (intro + 3 sections + outro)
- Up/down arrows work
- Each section renders with its template layout
- Outro slide shows recap

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/src/app/mock-course/page.tsx
git commit -m "feat: update mock-course to use structured template mock data"
```

---

## Task 12: Update seed script to validate and insert lesson sections

**Files:**
- Modify: `app/scripts/seed-content.mjs`

Add `assertValidContent` usage and insert rows into `lesson_sections` and `intro_content`/`outro_content`.

**Step 1: Add a dynamic import of the validation engine at the top of the seed script**

The seed script is ESM. It cannot import TypeScript directly — it needs the compiled output. Two options:
- Option A: Use `tsx` to run the seed script (add `tsx` dev dependency)
- Option B: Inline basic Zod validation in the seed script until a build step is added

**Use Option A** (cleaner, consistent with project direction):

```bash
cd app && npm install --save-dev tsx
```

Update `package.json` to run seed via tsx:

```json
"scripts": {
  "seed": "tsx scripts/seed-content.mjs"
}
```

Rename `seed-content.mjs` → `seed-content.ts` and update the shebang-free version.

**Step 2: Add imports to `seed-content.ts`**

```ts
import { assertValidContent } from '../src/lib/templates/validate.js';
```

**Step 3: Validate section content before inserting**

Before each `lesson_sections` insert, call:

```ts
const sectionContent = assertValidContent('code-section', {
  explanation: '...',
  code: '...',
  language: 'python',
});

await sql`
  INSERT INTO lesson_sections (id, lesson_id, position, template, content)
  VALUES (
    ${crypto.randomUUID()},
    ${lessonId},
    ${0},
    'code-section',
    ${JSON.stringify(sectionContent)}
  )
`;
```

**Step 4: Validate and insert `intro_content` on the lesson**

```ts
const intro = assertValidContent('lesson-intro', {
  hook: '...',
  outcomes: ['...'],
  estimated_minutes: 10,
});

await sql`
  UPDATE lessons SET intro_content = ${JSON.stringify(intro)} WHERE id = ${lessonId}
`;
```

**Step 5: Run the seed script to verify end-to-end**

```bash
cd app && npm run seed
```

Expected: no Zod errors, rows inserted into `lesson_sections`, `intro_content`/`outro_content` populated.

**Step 6: Commit**

```bash
git add app/scripts/ app/package.json app/package-lock.json
git commit -m "feat: update seed script to validate template content with assertValidContent before DB insert"
```

---

## Task 13: Final verification

**Step 1: Full type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors.

**Step 2: Lint**

```bash
cd app && npm run lint
```

Expected: zero errors.

**Step 3: Build**

```bash
cd app && npm run build
```

Expected: clean build, no type errors in output.

**Step 4: Smoke-test the dev server**

```bash
cd app && npm run dev
```

- `/mock-course` — template smoke test, all 5 nav items render
- A real lesson route — renders with structured sections from DB (or gracefully falls back if no sections seeded yet)

**Step 5: Commit**

```bash
git commit -m "chore: template system implementation complete — all checks pass"
```

---

## Adding a New Template (future reference)

1. Add schema to `app/src/lib/templates/schemas.ts` (TypeScript errors if fields conflict)
2. Create component at `app/src/components/templates/<name>.tsx`
3. Add entry to `templateComponents` in `app/src/components/templates/index.ts` — TypeScript errors if missing
4. Add template name to the DB CHECK constraint in a new migration
5. Run `npx tsc --noEmit` to confirm full coverage
