# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An opinionated course platform for AI-era learning. Phase 1 is the learner platform (current). Phase 2 will be the instructor authoring platform.

See `brochure.md` for course content details and `app/migrations/MIGRATION_NOTES.md` for schema history.

---

## Two-App Architecture

| App | Directory | Purpose |
|-----|-----------|---------|
| **Platform** | `app/` | Full learner platform (auth, dashboard, lessons, quizzes) |
| **Landing** | `web/` | Marketing landing page only |

Most active development happens in `app/`.

---

## Development Commands

```bash
# Platform (app/)
cd app
npm run dev          # Dev server (localhost:3000)
npm run build
npm run lint
npx tsc --noEmit     # Type check

# Content scripts (run from repo root, require app/.env.local)
node app/scripts/validate-content.mjs   # Validate DB content integrity — exits 0 (clean) / 1 (violations)
node app/scripts/seed-content.mjs       # Purge + reseed all course content, runs validate at end

# Landing page (web/)
cd web
npm run dev
npm run build
```

CI runs only on `web/` (`.github/workflows/ci.yml`) — type-check + lint + build.

---

## App Platform Architecture (`app/`)

### Data Model (Neon PostgreSQL)

```
courses → modules → lessons → test_cases
                             → user_code
               → user_quiz_attempts
```

- **courses**: `id, title, slug, description, thumbnail_url, outcomes[], tag, order`
- **modules**: `id, course_id, title, description, order, lesson_count, quiz_form (JSONB)`
- **lessons**: `id, module_id, lesson_index, title, content, code_template, solution_code, entry_point, problem_summary, problem_constraints TEXT[], problem_hints TEXT[]`
- **test_cases**: `id, lesson_id, position, description, args JSONB, expected JSONB, visible BOOLEAN` — normalised from JSONB in 2026-02-25 migration
- **user_code**: `user_id, lesson_id, code, last_test_results JSONB, passed_at` — lesson completion is tracked via `passed_at IS NOT NULL`
- **user_quiz_attempts**: `user_id, module_id, score_percent, passed, attempted_at`

No ORM — raw SQL via `@neondatabase/serverless`. Migrations in `app/migrations/`.

Key constraints: `entry_point` requires `code_template`; `quiz_form` has structural CHECK (title, questions ≥ 1, passingScore 0–100); `lesson_index >= 0`.

### Key Data Fetching (`app/src/lib/data.ts`)

- `React.cache()` for per-request deduplication in Server Components
- Batch queries everywhere to avoid N+1 — `getCoursesForSidebar()` loads all courses + modules in 2 queries; `get_batch_course_progress()` and `get_batch_module_completion_status()` are Postgres functions
- `getLesson(moduleId, position)` — 1-indexed position; aggregates `test_cases` rows via correlated subquery into `testCases: TestCase[]`
- `getSectionCompletionStatus(userId, modules[])` — returns map with keys `"{moduleId}:lesson-{i}"` and `"{moduleId}:quiz"`
- `LessonData` shape: flat `problemSummary`, `problemConstraints`, `problemHints` (no nested object)

### Code Execution (Judge0)

Python execution via Judge0 CE (RapidAPI). `app/src/lib/judge0.ts`, `app/src/lib/python-output.ts`, rate limit state in `RateLimitContext` (`app/src/context/rate-limit-context.tsx`).

Single **Run** button fires two parallel Judge0 calls: `runCode()` for raw stdout, `runTests()` for per-test-case pass/fail. Test harness wraps user code with:

```python
import json as _json
_args = _json.loads('<argsJson>')
_result = entryPoint(*_args)
print(_json.dumps(_result, separators=(',', ':')))
```

Pass comparison: `stdout.trim() === JSON.stringify(tc.expected)` — `expected` is JSONB-typed so booleans, lists, dicts, and None all round-trip correctly.

`ExecutionPhase`: `idle | running | run-pass | run-fail | error | tle`. Tests tab hidden until `hasRun = true`.

### Authentication (Neon Auth)

Password-less OTP via `@neondatabase/auth`. No middleware — protected routes call `auth()` directly.

```typescript
import { auth } from '@/lib/auth/server';   // server components / API routes
import { authClient } from '@/lib/auth/client'; // client components
```

Auth routes: `/api/auth/[...path]`. UI flows: `/auth/[path]`.

### Routing

```
/dashboard/course/[courseId]/[moduleId]/lesson/[order]  # Lesson player (1-indexed order)
/dashboard/course/[courseId]/[moduleId]/quiz            # Quiz player
/auth/[path]        # Neon Auth
/account/[path]     # User settings
```

### Component Organisation

```
app/src/components/
├── ui/          # shadcn/ui primitives
├── shared/      # app-sidebar, auth-dialog, markdown, user-button, theme-provider
├── dashboard/   # course grid, activity heatmap, continue-learning
└── lesson/      # code-editor (CodeMirror), output-panel, problem-panel, code-lesson-layout
```

### Styling

Tailwind CSS v4 + CSS variables (`app/src/app/globals.css`). Fonts: `DM_Sans` (UI), `JetBrains_Mono` (code), `Playfair_Display` (headings). Dark mode via `next-themes`.

---

## API Routes (`app/src/app/api`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...path]` | * | Neon Auth |
| `/api/progress/lesson` | POST/DELETE | Mark lesson complete/incomplete |
| `/api/quiz/submit` | POST/DELETE | Submit or reset quiz |
| `/api/code/run` | POST | Execute Python via Judge0 (returns stdout) |
| `/api/code/test` | POST | Run test cases via Judge0 |
| `/api/code/save` | POST | Autosave code + persist test results |
| `/api/code/usage` | GET | Judge0 rate limit quota |

---

## Required Env Vars (`app/.env.local`)

```
DATABASE_URL              # Neon Postgres connection string
NEON_AUTH_BASE_URL        # Neon Auth API URL
NEON_AUTH_COOKIE_SECRET   # Cookie secret
NEXT_PUBLIC_ROOT_DOMAIN   # e.g. zuzu.codes
NEXT_PUBLIC_APP_URL       # e.g. https://zuzu.codes
JUDGE0_API_KEY            # RapidAPI key
JUDGE0_API_HOST           # e.g. judge0-ce.p.rapidapi.com
```

---

## Landing Page (`web/`)

Separate Next.js app. Static JSON data in `web/src/data/` with optional Supabase fallback. GSAP + Motion for animations.
