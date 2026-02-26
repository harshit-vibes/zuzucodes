# Template System Design

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Lesson sections, lesson/module/course intro & outro — template definitions, validation engine, LLM ingestion pipeline

---

## Problem

The platform has no concept of structured content areas. Lessons store raw Markdown in a `content TEXT` field split by `---` separators. There is no intro/outro at any level (lesson, module, course), no per-section layout metadata, and no validation of content structure.

The goal is to introduce a typed template system where every content area (intro, section, outro) has a declared layout template that defines both its visual rendering and its required content slots.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Template definitions | TypeScript only (no DB table) | Templates are fixed per content type; no per-record template choice needed |
| Template count | ~10–30, organized by level | Moderate set; fixed in code, not dynamic |
| Content storage | JSONB fields on existing tables + new `lesson_sections` table | Content is data (DB), templates are code (TS) |
| Sections | Normalized to own table | Queryable individually, removes fragile `---` text splitting |
| Validation layers | Application (Zod) + DB (CHECK constraints) | Belt-and-suspenders; Zod for rich errors, CHECK for rogue writes |
| Schema/component coupling | Separate files | `schemas.ts` is server-safe (no React); components are client-only. Next.js App Router boundary requires this. |
| LLM output | JSON structured output constrained by Zod-derived JSON Schema | Same schemas serve dual purpose: validation + LLM prompt constraint |

---

## Data Model

### New table: `lesson_sections`

Replaces the `content TEXT` field splitting approach.

```sql
CREATE TABLE lesson_sections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position   INT NOT NULL,       -- 0-indexed ordering within lesson
  template   TEXT NOT NULL,      -- 'code-section' | 'prose-section' | 'challenge-section'
  content    JSONB NOT NULL,     -- slots defined per template (validated by Zod before insert)
  UNIQUE (lesson_id, position)
);
```

### New columns on existing tables

```sql
-- Lesson intro/outro (rendered in the lesson player)
ALTER TABLE lessons
  ADD COLUMN intro_content JSONB,
  ADD COLUMN outro_content JSONB;

-- Module intro/outro (rendered on the module overview page)
ALTER TABLE modules
  ADD COLUMN intro_content JSONB,
  ADD COLUMN outro_content JSONB;

-- Course intro/outro (rendered on the course overview page)
ALTER TABLE courses
  ADD COLUMN intro_content JSONB,
  ADD COLUMN outro_content JSONB;
```

All new columns are nullable. Null means no intro/outro for that entity.

### Deprecation

`lessons.content TEXT` is deprecated. It is kept during the transition period while content is migrated to `lesson_sections`. It will be removed in a follow-up migration once all lessons are seeded with structured sections.

### DB CHECK constraints (hard invariants)

```sql
-- lesson_sections
ALTER TABLE lesson_sections
  ADD CONSTRAINT lesson_sections_content_is_object
    CHECK (jsonb_typeof(content) = 'object'),
  ADD CONSTRAINT lesson_sections_template_valid
    CHECK (template IN ('code-section', 'prose-section', 'challenge-section'));

-- lessons
ALTER TABLE lessons
  ADD CONSTRAINT lessons_intro_content_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT lessons_outro_content_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- modules
ALTER TABLE modules
  ADD CONSTRAINT modules_intro_content_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT modules_outro_content_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');

-- courses
ALTER TABLE courses
  ADD CONSTRAINT courses_intro_content_is_object
    CHECK (intro_content IS NULL OR jsonb_typeof(intro_content) = 'object'),
  ADD CONSTRAINT courses_outro_content_is_object
    CHECK (outro_content IS NULL OR jsonb_typeof(outro_content) = 'object');
```

---

## Template Catalogue

| Template name | Level | Slots |
|---|---|---|
| `lesson-intro` | Lesson | `hook`, `outcomes[]`, `estimated_minutes?` |
| `lesson-outro` | Lesson | `recap`, `next_lesson_teaser?` |
| `code-section` | Lesson section | `explanation`, `code`, `language`, `takeaway?` |
| `prose-section` | Lesson section | `markdown` |
| `challenge-section` | Lesson section | _(maps to existing `problem_*` fields on lesson — no JSONB content)_ |
| `module-intro` | Module | `title`, `description`, `what_you_learn[]` |
| `module-outro` | Module | `recap`, `next_module?` |
| `course-intro` | Course | `hook`, `outcomes[]`, `who_is_this_for?` |
| `course-outro` | Course | `recap`, `certificate_info?` |

---

## File Structure

```
app/src/
  lib/
    templates/
      schemas.ts          ← Zod schemas for all templates (server-safe, no React)
      validate.ts         ← dispatch engine: validateContent() and assertValidContent()
      types.ts            ← TypeScript types inferred from schemas
      json-schema.ts      ← getJsonSchemaForTemplate() for LLM structured output
  components/
    templates/
      index.ts            ← component registry (mapped type enforces full coverage)
      lesson-intro.tsx
      lesson-outro.tsx
      code-section.tsx
      prose-section.tsx
      module-intro.tsx
      module-outro.tsx
      course-intro.tsx
      course-outro.tsx
```

---

## Validation Engine

### `schemas.ts` — Zod schemas with `.describe()` for LLM context

```ts
import { z } from 'zod';

export const schemas = {
  'lesson-intro': z.object({
    hook: z.string().min(1).describe('Opening sentence that frames why this lesson matters.'),
    outcomes: z.array(z.string()).min(1).describe('What the learner will be able to do after this lesson.'),
    estimated_minutes: z.number().int().positive().optional().describe('Estimated completion time in minutes.'),
  }),
  'lesson-outro': z.object({
    recap: z.string().min(1).describe('2-3 sentence summary of what was covered.'),
    next_lesson_teaser: z.string().optional().describe('One sentence previewing what comes next.'),
  }),
  'code-section': z.object({
    explanation: z.string().min(1).describe('Prose explanation of the concept. 2-4 sentences.'),
    code: z.string().min(1).describe('Python code example. Should be complete and runnable.'),
    language: z.string().default('python').describe('Language identifier for syntax highlighting.'),
    takeaway: z.string().optional().describe('One-sentence summary of what the learner should remember.'),
  }),
  'prose-section': z.object({
    markdown: z.string().min(1).describe('Markdown content for a text-only section.'),
  }),
  'module-intro': z.object({
    title: z.string().min(1).describe('Module title.'),
    description: z.string().min(1).describe('What this module covers, 2-3 sentences.'),
    what_you_learn: z.array(z.string()).min(1).describe('Bullet list of learning outcomes for the module.'),
  }),
  'module-outro': z.object({
    recap: z.string().min(1).describe('Summary of what the module covered.'),
    next_module: z.string().optional().describe('Name or teaser of the next module.'),
  }),
  'course-intro': z.object({
    hook: z.string().min(1).describe('Opening hook for the course.'),
    outcomes: z.array(z.string()).min(1).describe('High-level outcomes for the full course.'),
    who_is_this_for: z.string().optional().describe('Target audience description.'),
  }),
  'course-outro': z.object({
    recap: z.string().min(1).describe('Summary of the full course journey.'),
    certificate_info: z.string().optional().describe('Info about any certificate or credential earned.'),
  }),
} as const;

export type TemplateName = keyof typeof schemas;
```

### `validate.ts` — dispatch engine

```ts
import { z } from 'zod';
import { schemas, type TemplateName } from './schemas';

export type ValidationResult<T extends TemplateName> =
  | { success: true; data: z.infer<typeof schemas[T]> }
  | { success: false; error: z.ZodError };

// API routes: returns structured result, caller decides response
export function validateContent<T extends TemplateName>(
  template: T,
  content: unknown,
): ValidationResult<T> {
  const result = schemas[template].safeParse(content);
  return result.success
    ? { success: true, data: result.data as z.infer<typeof schemas[T]> }
    : { success: false, error: result.error };
}

// Seed scripts: throws immediately on invalid — CI catches failure
export function assertValidContent<T extends TemplateName>(
  template: T,
  content: unknown,
): z.infer<typeof schemas[T]> {
  return schemas[template].parse(content);
}
```

### `types.ts` — inferred types

```ts
import type { z } from 'zod';
import type { schemas, TemplateName } from './schemas';

export type TemplateContent<T extends TemplateName> = z.infer<typeof schemas[T]>;
```

Types are always derived from schemas — no hand-written types, no drift.

### `json-schema.ts` — LLM output constraint

```ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { schemas, type TemplateName } from './schemas';

export function getJsonSchemaForTemplate(template: TemplateName) {
  return zodToJsonSchema(schemas[template], { name: template });
}
```

### `components/templates/index.ts` — component registry

```ts
import type { ComponentType } from 'react';
import type { TemplateName, TemplateContent } from '@/lib/templates/types';

// Mapped type: TypeScript errors if any template name lacks a component
type TemplateComponentMap = {
  [K in TemplateName]: ComponentType<{ content: TemplateContent<K> }>;
};

export const templateComponents: TemplateComponentMap = {
  'lesson-intro':  LessonIntro,
  'lesson-outro':  LessonOutro,
  'code-section':  CodeSection,
  'prose-section': ProseSection,
  'module-intro':  ModuleIntro,
  'module-outro':  ModuleOutro,
  'course-intro':  CourseIntro,
  'course-outro':  CourseOutro,
};
```

Adding a template to `schemas.ts` without a component causes a compile-time error here.

---

## LLM Ingestion Pipeline

Content is generated by LLM with JSON structured output, then ingested into the system.

```
LLM API call
  └─ system prompt includes getJsonSchemaForTemplate(templateName)
  └─ response_format: { type: 'json_schema', schema: ... }
       ↓
Raw JSON string from LLM
       ↓
JSON.parse()          ← catches malformed JSON
       ↓
validateContent() / assertValidContent()   ← Zod catches wrong fields/types
       ↓
  success → write to DB (lesson_sections / intro_content / outro_content)
  failure → log Zod error details, retry with error feedback in prompt, or flag for review
       ↓
DB CHECK constraint   ← final safety net for any rogue write
```

The `.describe()` annotations on each Zod field are included in the JSON Schema output and serve as per-field instructions for the LLM — one definition does double duty.

---

## Validation Trigger Points

| Trigger | Function | On failure |
|---|---|---|
| `seed-content.mjs` | `assertValidContent()` | Throws → script exits 1 → CI fails |
| `POST /api/lesson-section` | `validateContent()` | 400 with Zod error details |
| `PATCH /api/lesson-section/:id` | `validateContent()` | 400 with Zod error details |
| `POST /api/lesson` (intro/outro fields) | `validateContent()` | 400 with Zod error details |
| `PATCH /api/lesson/:id` | `validateContent()` | 400 with Zod error details |
| Any raw SQL write | DB CHECK constraint | Postgres rejects the write |
| Future authoring UI | Same API routes | Already handled |

---

## What Zod Schemas Do (five jobs, one definition)

| Job | Mechanism |
|---|---|
| TypeScript types | `TemplateContent<T>` inferred via `z.infer<>` |
| Runtime validation at API layer | `validateContent()` / `assertValidContent()` |
| LLM output constraint (prompt schema) | `getJsonSchemaForTemplate()` → passed as `response_format` |
| LLM field documentation | `.describe()` on each field, included in JSON Schema output |
| DB-level hard guard | CHECK constraints (independent of Zod, catches rogue writes) |

---

## Out of Scope

- Phase 2 authoring UI (builds on top of the same API routes)
- `challenge-section` component detail (maps to existing `problem_*` fields, minimal new work)
- LLM provider choice and prompt engineering (separate concern)
- Removing `lessons.content TEXT` (deferred migration, done after full content reseed)
