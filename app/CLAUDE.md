# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See the root `CLAUDE.md` for full project context. This file covers `app/`-specific details.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build
npm run lint
npx tsc --noEmit     # Type check

# Content scripts (require .env.local with DATABASE_URL)
node scripts/validate-content.mjs   # Validate DB content — exits 0 (clean) / 1 (violations)
node scripts/seed-content.mjs       # Purge + reseed all course content
```

## Architecture

### Data Model

```
courses → modules → lessons → test_cases
                             → user_code
               → user_quiz_attempts
```

- **lessons**: `id, module_id, lesson_index, title, content, code_template, solution_code, entry_point, problem_summary, problem_constraints TEXT[], problem_hints TEXT[]`
- **test_cases**: `id, lesson_id, position, description, args JSONB, expected JSONB, visible BOOLEAN`
- **user_code**: `user_id, lesson_id, code, last_test_results JSONB, passed_at` — `passed_at IS NOT NULL` = lesson completed
- **modules.quiz_form**: JSONB with CHECK constraint enforcing `title`, `questions` array ≥ 1, `passingScore` 0–100

No ORM — raw SQL via `@neondatabase/serverless`. Migrations in `migrations/`.

### Key Patterns

- `src/lib/data.ts` — all DB access. `React.cache()` on all per-request fetches. `getLesson()` aggregates test_cases via correlated subquery. No `LessonProblem` type — flat `problemSummary/Constraints/Hints` fields on `LessonData`.
- `src/lib/judge0.ts` — code execution (talks to the self-hosted Python executor service). Test harness uses `json.dumps(_result, separators=(',', ':'))` + `JSON.stringify(expected)` comparison. `visible: boolean` on `TestCase` (required, not optional).
- Auth: `src/lib/auth/server.ts` (`auth()`) for server, `src/lib/auth/client.ts` (`authClient`) for client. No middleware — routes check `auth()` directly.

### Routing

```
/dashboard/course/[courseId]/[moduleId]/lesson/[order]  # 1-indexed lesson position
/dashboard/course/[courseId]/[moduleId]/quiz
```

### Components

```
src/components/
├── ui/          # shadcn/ui primitives
├── shared/      # app-sidebar, auth-dialog, markdown, user-button
└── lesson/      # code-lesson-layout (main lesson player), problem-panel, code-editor, output-panel
```

`CodeLessonLayout` is the main lesson player — manages all execution state, auto-save (1500ms debounce), confetti on pass, and persists test results via `/api/code/save`.

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/code/run` | Raw Python stdout via Judge0 |
| `/api/code/test` | Per-test-case pass/fail |
| `/api/code/save` | Autosave code + persist last_test_results |
| `/api/progress/lesson` | Mark complete/incomplete |
| `/api/quiz/submit` | Submit or reset quiz |

## Required Env Vars

```
DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
NEXT_PUBLIC_ROOT_DOMAIN, NEXT_PUBLIC_APP_URL
EXECUTOR_URL              # Python executor Railway service URL
EXECUTOR_API_KEY          # Shared secret for executor auth (X-Api-Key header)
```
