# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An opinionated course platform for AI-era learning.

- **Phase 1 (Current)**: Learner platform for course consumption
- **Phase 2 (Future)**: Instructor platform for course creation and management

See `brochure.md` for detailed course offerings and `app/migrations/MIGRATION_NOTES.md` for schema history.

---

## Two-App Architecture

The project has two separate Next.js applications:

| App | Directory | Purpose |
|-----|-----------|---------|
| **Platform** | `app/` | Full learner platform (auth, dashboard, lessons, quizzes) |
| **Landing** | `web/` | Marketing landing page only |

**Most active development happens in `app/`.**

---

## Development Commands

```bash
# Platform (app/)
cd app
npm run dev          # Dev server (localhost:3000)
npm run dev:branch   # Dev against a specific Neon DB branch
npm run check-branch # Validate branch config
npm run build
npm run lint

# Landing page (web/)
cd web
npm run dev
npm run build
```

---

## App Platform Architecture (`app/`)

### Data Model (Neon PostgreSQL)

```
courses → modules → user_progress
```

- **Courses**: `id, title, slug, description, outcomes[], tag, order`
- **Modules**: `id, course_id, title, description, order, mdx_content, quiz_form (JSONB), section_count`
  - `mdx_content` is Markdown split by `\n---\n` — each section is a lesson
- **user_progress**: `user_id, module_id, section_index (null = quiz), score_percent, passed, completed_at`

No ORM — raw SQL via `@neondatabase/serverless`.

### Key Data Fetching Patterns (`app/src/lib/data.ts`)

- **`React.cache()`** for per-request deduplication in Server Components
- **Batch queries** to avoid N+1 (e.g., `getCoursesForSidebar()` loads all courses + modules in 2 queries)
- **Postgres batch functions**: `get_batch_course_progress()`, `get_batch_module_completion_status()`
- **`getMdxSection(content, index)`** — extracts a specific section from `mdx_content`

### Authentication (Neon Auth)

Password-less OTP authentication via `@neondatabase/auth`.

```typescript
// Server components / API routes
import { auth } from '@/lib/auth/server';
const { user, session } = await auth();

// Client components
import { authClient } from '@/lib/auth/client';
```

Auth routes are under `/api/auth/[...path]` and UI flows are at `/auth/[path]`.

### Routing

```
/                    # Landing page (public)
/dashboard           # Dashboard (protected)
/dashboard/course/[courseId]
/dashboard/course/[courseId]/[moduleId]/lesson/[order]  # Lesson player
/dashboard/course/[courseId]/[moduleId]/quiz            # Quiz player
/auth/[path]         # Neon Auth flows
/account/[path]      # User settings
/access-denied       # 403
```

Protected routes check `auth()` directly in server components/routes. `app/src/middleware.ts` was deleted.

### Component Organization

```
app/src/components/
├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
├── dashboard/       # Course grid, overview dialog, activity heatmap, continue-learning
├── landing/         # Hero, header, footer, pricing, etc.
├── app-sidebar.tsx  # Main navigation sidebar
├── auth-dialog.tsx  # Sign-in modal
├── markdown.tsx     # Markdown renderer (react-markdown + remark-gfm)
└── lesson-completion.tsx
```

### Styling

- Tailwind CSS v4 + CSS variables (`app/src/app/globals.css`)
- Fonts: `DM_Sans` (UI), `JetBrains_Mono` (code), `Playfair_Display` (headings)
- Dark mode via `next-themes`

---

## Landing Page Architecture (`web/`)

Separate Next.js app. Reads static JSON data from `web/src/data/` with optional Supabase fallback. Uses GSAP + Motion for animations.

ID conventions in data files: `course-{name}-001`, `module-{course}-{level}-001`, `lesson-{module}-{##}`, `mi-{module}-{##}`

---

## Database

- **App platform**: Neon Postgres — connection via `DATABASE_URL`
- **Landing page**: Supabase (read-only content) — legacy, JSON fallback available

### Required Env Vars (`app/`)

```
DATABASE_URL              # Neon Postgres connection string
NEON_AUTH_BASE_URL        # Neon Auth API URL
NEON_AUTH_COOKIE_SECRET   # Cookie secret (generate: openssl rand -base64 32)
NEXT_PUBLIC_ROOT_DOMAIN   # e.g. zuzu.codes
NEXT_PUBLIC_APP_URL       # e.g. https://zuzu.codes
```

---

## API Routes (`app/src/app/api`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...path]` | * | Neon Auth integration |
| `/api/courses/[courseId]/detail` | GET | Module details + progress + lesson titles |
| `/api/progress/lesson` | POST/DELETE | Mark lesson complete/incomplete |
| `/api/quiz/submit` | POST/DELETE | Submit or reset quiz attempt |
