# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An opinionated course platform for AI-era learning. Phase 1 is the learner platform (current). Phase 2 will be the instructor authoring platform.

See `brochure.md` for course content details and `app/migrations/MIGRATION_NOTES.md` for schema history.

---

## Two-App Architecture

| App | Directory | Vercel Project | Domain |
|-----|-----------|----------------|--------|
| **Platform** | `app/` | `web` (harshitvibes/web) | `app.zuzu.codes` |
| **Landing** | `web/` | `zuzucodes` (harshitvibes/zuzucodes) | `zuzu.codes` |

Most active development happens in `app/`.

> **IMPORTANT — Vercel deployments:** Each app is a separate Vercel project. Always deploy from the app's own subdirectory (or use the root `npm run deploy:*` scripts). Running `vercel --prod` from the repo root deploys to the wrong project.

```bash
# Deploy landing page (web/ → zuzu.codes)
npm run deploy:web

# Deploy platform (app/ → app.zuzu.codes)
npm run deploy:app
```

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

## Creating a Course

Use the `/create-course` Claude Code skill to generate and seed a new course end-to-end.

```bash
/create-course
```

The skill runs a 3-stage pipeline, pausing for human approval at every unit:

```
Stage 1 — Structure
  Agree title, tag, outcomes, modules, lesson titles + objectives
  → writes app/content/{course-slug}/course-outline.json
  → approve outline before anything is generated

Stage 2 — Content (per module, then per lesson)
  Module Agent   → module intro/outro → approve
  Lesson Agent   → Markdown body, problem fields, lesson intro/outro → approve
  Code Agent     → solution_code, code_template, test_cases (verified against executor) → approve
  Quiz Agent     → module quiz grounded in lesson content → approve

Stage 3 — Course level
  Course Content Agent → course intro/outro, confidence form → approve
  → seeder writes all JSON to Neon DB
```

**Content files land in:**
```
app/content/{course-slug}/
├── course-outline.json        # structure + per-unit completion status
├── course.json                # course row + intro/outro + confidence_form
└── {module-slug}/
    ├── module.json            # module row + intro/outro + quiz_form
    └── lessons/
        ├── 00-{lesson-slug}.json
        └── ...
```

**Seed manually (without running the full skill):**
```bash
cd app
npm run create-course-seed                        # seed all courses in app/content/
npm run create-course-seed -- --course=my-slug   # seed one course
npm run create-course-seed -- --allow-incomplete  # seed partial content (skips todos)
```

**Validate DB content integrity:**
```bash
node app/scripts/validate-content.mjs   # exits 0 (clean) / 1 (violations)
```

**Agent prompt files** (for reference/editing): `app/scripts/create-course/prompts/`

**Key rules for content JSON:**
- `_status` field is a local sentinel — never written to DB (seeder skips it)
- Module `quiz_form` must be non-null before seeding (DB enforces NOT NULL + structural CHECK)
- `lesson_index` is 0-based; `getLesson(moduleId, position)` in `data.ts` uses 1-based position
- Re-running the seeder is idempotent — all upserts use `ON CONFLICT (id) DO UPDATE`
- IDs follow `{type}-{course-slug}-{...}-001` convention (e.g. `course-intro-to-python-001`)

---

## Updating a Course

Use the `/update-course` Claude Code skill to update any unit of an existing course — lesson content, code challenge, module intro/outro, quiz, course-level forms, or structural changes (add/remove/reorder lessons and modules).

```bash
/update-course
```

The skill:
1. Asks which course (lists slugs from `app/content/`)
2. Asks what to update (free-form natural language)
3. Resolves intent to the correct agent(s)
4. Resets status, dispatches agent, validates, and runs the approve/edit/regenerate loop
5. Checks for cascade effects (stale neighbours) and offers to regenerate each
6. Seeds the course once all approvals are complete: `npm run create-course-seed -- --course={slug}`

Structural changes (add/remove/reorder) update `course-outline.json` first and show a diff before dispatching any agents.

**Reuses all agent prompts:** `app/scripts/create-course/prompts/`

**Status management:** Same dual-write rule as `/create-course` — `_status` in entity files + `status` map in `course-outline.json`.

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

### Code Execution (Python Executor)

Python execution via a self-hosted executor service (Railway). `app/src/lib/judge0.ts`, `app/src/lib/python-output.ts`. Concurrency control is handled server-side by the executor (no client-side rate limiting).

Single **Run** button fires two parallel executor calls: `runCode()` for raw stdout, `runTests()` for per-test-case pass/fail. Test harness wraps user code with:

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
| `/api/code/run` | POST | Execute Python via executor service (returns stdout) |
| `/api/code/test` | POST | Run test cases via executor service |
| `/api/code/save` | POST | Autosave code + persist test results |

---

## Required Env Vars (`app/.env.local`)

```
DATABASE_URL              # Neon Postgres connection string
NEON_AUTH_BASE_URL        # Neon Auth API URL
NEON_AUTH_COOKIE_SECRET   # Cookie secret
NEXT_PUBLIC_ROOT_DOMAIN   # e.g. zuzu.codes
NEXT_PUBLIC_APP_URL       # e.g. https://zuzu.codes
EXECUTOR_URL              # Python executor Railway service URL
EXECUTOR_API_KEY          # Shared secret for executor auth
```

---

## PayPal Integration

SDK: `@paypal/react-paypal-js` v9 (sdk-v6 import path). Uses `PayPalProvider` (not `PayPalScriptProvider`).
Env vars: `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE` (sandbox/live), `PAYPAL_BASE_URL`.
Sandbox dashboard: https://sandbox.paypal.com

**PayPal MCP Server** (use during development to create products/plans/test subscriptions):
- Local: `npx @paypal/mcp --tools=all` with `PAYPAL_ACCESS_TOKEN` + `PAYPAL_ENVIRONMENT=SANDBOX`
- Remote sandbox: `https://mcp.sandbox.paypal.com` (SSE: `/sse`, HTTP: `/http`)
- MCP quickstart: https://docs.paypal.ai/developer/tools/ai/mcp-quickstart
- Prompt best practices: https://docs.paypal.ai/developer/tools/ai/prompt-best-practices

**Reference docs:**
- SDK JS overview: https://developer.paypal.com/md/sdk/js/
- Performance: https://developer.paypal.com/md/sdk/js/performance/
- Best practices: https://developer.paypal.com/md/sdk/js/best-practices/

---

## Landing Page (`web/`)

Separate Next.js app. Static JSON data in `web/src/data/` with optional Supabase fallback. GSAP + Motion for animations.

---

## Roadmap

See [`roadmap.md`](./roadmap.md) at the repo root.