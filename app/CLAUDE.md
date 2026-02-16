# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An AI-native upskilling platform for modern professionals.

**Single-tenant architecture**: Each deployment serves one organization (e.g., zuzu.codes for public, potential white-label instances later).

Built with Next.js 16 (App Router), Auth.js (NextAuth v5 beta) with magic link passwordless authentication, and Neon Postgres as the database.

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

### Authentication Flow

Auth.js (NextAuth v5 beta) handles authentication with magic link (passwordless):
- `src/auth.ts`: Auth.js setup with Neon adapter and session configuration
- `src/auth.config.ts`: Resend provider configuration and protected route logic
- `src/middleware.ts`: Route protection using Auth.js middleware
- `src/components/providers/auth-provider.tsx`: Client-side SessionProvider wrapper

Protected routes: `/dashboard`, `/learn`, `/account`
Public routes: `/`, `/sign-in`, `/check-email`, `/api/auth/*`

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

- **React.cache()**: Used in `src/lib/supabase.ts` to deduplicate fetches within a request
- **Server Components**: Dashboard pages are RSC, use `auth()` from `src/auth.ts`
- **Client/Server separation**: Auth provider uses client components with SessionProvider
- **API route auth pattern**: Get session with `auth()`, verify user, then query database
- **Raw SQL queries**: Direct SQL via `@neondatabase/serverless` instead of ORM

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
- **Auth**: Auth.js (NextAuth v5 beta) with Neon adapter
- **Database**: Neon Postgres (via `@neondatabase/serverless`)
- **Email**: Resend for magic link delivery
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React

---

## Environment Variables

Required:
- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_SECRET` — Generate with `openssl rand -base64 32`
- `AUTH_RESEND_KEY` — Resend API key for magic link emails
- `NEXT_PUBLIC_ROOT_DOMAIN` — Domain for redirects (e.g., `zuzu.codes`)
- `NEXT_PUBLIC_APP_URL` — Full app URL (e.g., `https://zuzu.codes`)

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

Neon Postgres database with Auth.js tables.

Key tables:
- `users` → User accounts (Auth.js compatible)
- `accounts`, `sessions`, `verification_tokens` → Auth.js tables
- `courses` → Top-level content container
- `modules` → Content units with MDX and quizzes
- `user_progress` → Completion tracking

Apply Auth.js schema with Neon adapter migrations.

---

## Notes

- No multi-tenancy: single organization per deployment
- No tracks: courses are standalone entities
- Module-first content: lessons are sections within modules
- Progressive disclosure: unlock content as users progress
