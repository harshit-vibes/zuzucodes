# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An AI-native upskilling platform for modern professionals.

**Single-tenant architecture**: Each deployment serves one organization (e.g., zuzu.codes for public, potential white-label instances later).

Built with Next.js 16 (App Router), Neon Auth (beta) for passwordless authentication, and Neon Postgres as the database.

---

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
npm start        # Start production server
npx tsc --noEmit # Type check
```

---

## Architecture

### Authentication

**Neon Auth** - Integrated authentication using `@neondatabase/auth` (beta)

**Key Features**:
- Email OTP (one-time password) authentication - passwordless magic link
- Email verification required at sign-up (prevents spam accounts)
- Branch-based auth - each database branch has isolated users and sessions
- Pre-built UI components (`SignInForm`, `SignUpForm`)
- Session management via secure HTTP-only cookies

**Implementation**:
- `src/lib/auth/server.ts` - Server-side auth instance (`authServer`, `auth`)
- `src/lib/auth/client.ts` - Client-side auth instance (`authClient`)
- `src/middleware.ts` - Route protection using `neonAuthMiddleware`
- `src/components/auth-dialog.tsx` - Sign-in/sign-up UI with email verification
- `src/components/email-verification.tsx` - Email verification flow

**Protected routes**: `/dashboard`, `/learn`, `/account`
**Public routes**: `/`, `/api/*`

**Branch isolation**: Users created in dev branches don't appear in production. See `docs/BRANCH_AUTH_GUIDE.md` for workflow.

### Data Model

```
courses
  └── modules (ordered by position)
        ├── mdx_content (TEXT, sections separated by \n---\n)
        └── quiz_form (JSONB, optional)

user_progress (tracks completion)
  ├── lesson progress (module_id + section_index)
  └── quiz attempts (module_id, section_index IS NULL)
```

**Modules** are the core content unit:
- `mdx_content`: Markdown sections separated by `\n---\n`
- `quiz_form`: JSONB quiz structure (optional)
- `section_count`: Number of sections (lessons) in the module
- Each section represents one lesson

**Progress tracking**:
- `user_progress` table tracks completion by (user_id, module_id, section_index)
- `section_index` is the 0-based index of the lesson
- `section_index IS NULL` indicates a quiz attempt
- Quiz rows include `score_percent` and `passed` fields

### Content Validation (`src/lib/module-schema.ts`)

The `module_schema` table defines validation rules:
- **MDX rules**: allowed elements, section limits, character limits
- **Quiz rules**: required fields, question limits, passing score
- Schema versioning with `is_active` flag
- All content validated against active schema

### Key Patterns

- **React.cache()**: Used in `src/lib/data.ts` to deduplicate fetches within a request
- **Server Components**: Dashboard pages are RSC, use `auth()` from `src/lib/auth/server.ts` to get session
- **API route auth pattern**: Get session with `auth()`, verify user, then query database
- **Raw SQL queries**: Direct SQL via `@neondatabase/serverless` instead of ORM
- **Branch-based development**: Database and auth are branch-specific for isolated testing

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/progress/lesson` | POST/DELETE | Mark lesson complete/incomplete |
| `/api/quiz/submit` | POST/DELETE | Submit quiz / reset quiz |
| `/api/internal/courses` | GET/POST | List/create courses |
| `/api/internal/courses/[id]` | GET/PUT/DELETE | Get/update/delete course |
| `/api/internal/modules` | GET/POST | List/create modules |
| `/api/internal/modules/[id]` | GET/PUT/DELETE | Get/update/delete module |

---

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19, Server Components)
- **Auth**: Neon Auth (`@neondatabase/auth` v0.1.0-beta.21) with email OTP
- **Database**: Neon Postgres (via `@neondatabase/serverless`)
- **Email**: Neon's shared email provider (for auth emails)
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React

---

## Environment Variables

Required:
- `DATABASE_URL` — Neon Postgres connection string
- `NEON_AUTH_BASE_URL` — Neon Auth API URL (from Neon Console → Auth)
- `NEON_AUTH_COOKIE_SECRET` — Cookie encryption secret (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_ROOT_DOMAIN` — Domain for redirects (e.g., `zuzu.codes`)
- `NEXT_PUBLIC_APP_URL` — Full app URL (e.g., `https://zuzu.codes`)

**Branch-specific**: When using database branches, ensure `DATABASE_URL` and `NEON_AUTH_BASE_URL` are from the same branch. Use `npm run check-branch` to validate.

---

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`)

---

## Content Management Workflow

1. **Create course**: POST `/api/internal/courses`
2. **Create module**: POST `/api/internal/modules` with:
   - `course_id`: Parent course
   - `mdx_content`: Markdown sections separated by `\n---\n`
   - `quiz_form`: JSONB quiz structure (optional)
3. **Section count**: Auto-calculated by splitting `mdx_content`
4. **Validation**: All creates/updates validate against active schema
5. **Progress tracking**: Users complete sections and quizzes

---

## Database Schema

Neon Postgres database with two schemas:

**`neon_auth` schema** (managed by Neon Auth):
- `users` → User accounts with email, password hash, verification status
- `sessions` → Active user sessions
- `otps` → One-time passwords for email verification

**`public` schema** (application data):
- `courses` → Top-level content container
- `modules` → Content units with MDX and quizzes
- `user_progress` → Completion tracking (references `neon_auth.users.id`)

Auth schema is automatically created and managed by Neon when Auth is enabled. Application schema is managed via migrations.

---

## Notes

- No multi-tenancy: single organization per deployment
- No tracks: courses are standalone entities
- Module-first content: lessons are sections within modules
- Progressive disclosure: unlock content as users progress
