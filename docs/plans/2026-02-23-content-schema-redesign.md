# Content Schema Redesign

**Date:** 2026-02-23
**Status:** Approved

## Background

After migrating lesson content from `modules.mdx_content` (split by `\n---\n`) into a normalized `lessons` table, the existing `module_schema` table became broken:

- `module_schema` had 0 rows (never seeded)
- It validated `mdx_content` as a multi-section blob — a concept that no longer exists
- `modules.schema_version` was a FK to `module_schema` — but with a global schema, per-module version tracking adds no value
- `modules.mdx_content` was made nullable post-migration but never dropped

The platform is heading toward a **Phase 2 instructor editor** where third-party instructors submit content. Schema validation is the content quality gate at submission time.

## Goals

- Clean up the dead `modules` columns (`mdx_content`, `schema_version`)
- Replace `module_schema` with a simpler `content_schema` table
- Validation rules are **global** (one active schema for the whole platform)
- Validation operates at three granularities: per-lesson content, per-module structure, per-quiz form

## Design

### Database

**Drop from `modules` table:**
- `mdx_content TEXT` — fully migrated to `lessons` table, nothing reads it
- `schema_version INTEGER` — per-module version FK is pointless with a global schema

**Drop table:**
- `module_schema` — replaced by `content_schema`

**Create table:**
```sql
CREATE TABLE content_schema (
  version     INTEGER PRIMARY KEY,
  description TEXT,
  schema_def  JSONB NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Seed v1 active schema:**
```json
{
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
}
```

### Code: `module-schema.ts` → `content-schema.ts`

**Exported functions:**

| Function | Description |
|---|---|
| `getActiveSchema()` | Queries `content_schema WHERE is_active = true LIMIT 1` — `React.cache()` wrapped |
| `validateLessonContent(content, lessonRules)` | Validates a single lesson's markdown string — no section splitting |
| `validateModuleStructure(lessonCount, hasQuiz, moduleRules)` | Validates lesson count range + quiz presence against rules |
| `validateQuizForm(quizForm, quizRules)` | Unchanged in logic from current implementation |

**Removed:**
- `getSchemaByVersion()` — unnecessary when always using active schema
- `validateMdxContent()` / `validateMdxContentV1()` / `validateMdxContentV2()` — these operated on multi-section blobs
- `splitMdxSections` import from `mdx-utils`

**Types updated:**
```ts
interface ContentSchema {
  version: number;
  description: string | null;
  schema_def: {
    lesson_rules: LessonRules;
    module_rules: ModuleRules;
    quiz_rules: QuizRules;
  };
  is_active: boolean;
  created_at: string;
}

interface LessonRules {
  maxChars: number;
  requireH1: boolean;
  allowedLanguages: string[];
  disallowedHtmlPatterns: string[];
}

interface ModuleRules {
  minLessons: number;
  maxLessons: number;
  quizOptional: boolean;
}
```

`QuizRules` interface remains unchanged.

### Code: `detail/route.ts` cleanup

Currently has a fallback: `getMdxSectionTitles(m.mdx_content)`. Once `mdx_content` is dropped from `modules`, this path is unreachable. Update the query to JOIN `lessons` for titles directly, removing the fallback entirely.

### `mdx-utils.ts`

`splitMdxSections` and `getMdxSection` are no longer called anywhere once `mdx_content` is gone. Remove them. Keep `getMdxSectionTitle` / `getMdxSectionTitles` only if still referenced elsewhere; otherwise remove those too.

## Files Affected

| File | Change |
|---|---|
| `app/migrations/20260223-content-schema.sql` | New migration |
| `app/src/lib/content-schema.ts` | New file (replaces module-schema.ts) |
| `app/src/lib/module-schema.ts` | Delete |
| `app/src/lib/mdx-utils.ts` | Remove unused functions |
| `app/src/app/api/courses/[courseId]/detail/route.ts` | Query lesson titles from DB, remove mdx_content fallback |
| Any file importing `module-schema.ts` | Update imports |

## What Is NOT in Scope

- Building the instructor editor UI (Phase 2)
- Wiring validation into API routes (Phase 2 — no instructor submission routes exist yet)
- Code execution / Pyodide feature (separate track)
