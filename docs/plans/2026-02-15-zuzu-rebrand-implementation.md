# zuzu.codes Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand Lyzr Academy platform to zuzu.codes with fresh infrastructure, simplified single-tenant architecture, and new landing page.

**Architecture:** Single-tenant Next.js 16 app with Supabase Auth, Neon Postgres database, deployed on Vercel. Removes multi-tenant/subdomain support, removes tracks (direct course access), keeps full LMS features (courses, modules, lessons, quizzes, progress tracking).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Neon Postgres, Supabase Auth, Vercel, shadcn/ui

---

## Task 1: Infrastructure Setup

**Files:**
- Create: `app/.env.local`
- Modify: `app/.env.local.example`
- Reference: `docs/plans/2026-02-15-zuzu-rebrand-design.md`

### Step 1: Create GitHub repository

Run from project root:
```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
gh repo create zuzucodes/platform --private --description "zuzu.codes learning platform"
```

Expected: Repository created at github.com/zuzucodes/platform

### Step 2: Initialize git in app directory

```bash
cd app
git init
git add .
git commit -m "Initial commit: Lyzr Academy codebase (pre-rebrand)"
```

Expected: Local git repository initialized

### Step 3: Connect to remote and push

```bash
git branch -M main
git remote add origin https://github.com/zuzucodes/platform.git
git push -u origin main
```

Expected: Code pushed to GitHub

### Step 4: Create Neon project

```bash
neonctl projects create --name zuzu-codes
```

Expected: Output shows project ID and connection string
Save the connection string for next steps

### Step 5: Create Neon development branch

```bash
neonctl branches create --project-id <project-id-from-step-4> --name development
```

Expected: Development branch created with separate connection string

### Step 6: Set up Vercel project

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
vercel link
```

When prompted:
- Link to existing project? No
- Project name: zuzu-codes-platform
- Directory: ./ (current directory)

Expected: Project linked, .vercel directory created

### Step 7: Connect domain to Vercel project

```bash
vercel domains add zuzu.codes
```

Expected: Domain connected (may need DNS verification)

### Step 8: Set up environment variables in Vercel

```bash
# Set DATABASE_URL (use production Neon connection string)
vercel env add DATABASE_URL production

# Set NEXT_PUBLIC_ROOT_DOMAIN
vercel env add NEXT_PUBLIC_ROOT_DOMAIN production
# Enter: zuzu.codes

# Set NEXT_PUBLIC_APP_URL
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://zuzu.codes

# Set SUPABASE_SECRET (will be added after Supabase setup)
vercel env add SUPABASE_SECRET production
# Enter: (your Supabase service role key)

# Set NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: (your Supabase project URL)

# Set NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: (your Supabase anon key)
```

Expected: All environment variables configured

### Step 9: Create local .env.local file

Create `app/.env.local`:
```env
# Neon Database (development branch)
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SECRET=eyJ...

# App Configuration
NEXT_PUBLIC_ROOT_DOMAIN=zuzu.codes
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Expected: Local environment configured

### Step 10: Update .env.local.example

Edit `app/.env.local.example`:
```env
# Neon Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SECRET=eyJ...

# App Configuration
NEXT_PUBLIC_ROOT_DOMAIN=zuzu.codes
NEXT_PUBLIC_APP_URL=https://zuzu.codes
```

Expected: Template updated with zuzu.codes values

### Step 11: Commit infrastructure setup

```bash
git add .env.local.example .vercel
git commit -m "chore: configure infrastructure (Vercel, Neon, environment variables)

- Set up Vercel project with zuzu.codes domain
- Configure environment variables for production and development
- Update .env.local.example template

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Changes committed

---

## Task 2: Code Cleanup - Remove Multi-Tenant Files

**Files:**
- Delete: `app/src/lib/tenant.ts`
- Delete: `app/scripts/notion-export/` (entire directory)
- Delete: `app/supabase/migrations/` (entire directory)
- Delete: `app/docs/` (if exists)

### Step 1: Remove tenant utilities

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
rm src/lib/tenant.ts
```

Expected: File removed

### Step 2: Remove Notion export scripts

```bash
rm -rf scripts/notion-export
```

Expected: Directory removed

### Step 3: Remove old migrations

```bash
rm -rf supabase/migrations
mkdir -p supabase/migrations
```

Expected: Old migrations cleared, fresh migrations directory created

### Step 4: Remove old docs (if exists)

```bash
rm -rf docs
```

Expected: Old docs removed (or command reports "No such file or directory" - both OK)

### Step 5: Commit cleanup

```bash
git add -A
git commit -m "chore: remove multi-tenant code and legacy migrations

- Remove tenant.ts (subdomain detection utilities)
- Remove Notion export scripts (Lyzr content)
- Clear old migrations directory (will create fresh schema)
- Remove legacy documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Cleanup committed

---

## Task 3: Code Cleanup - Update Middleware

**Files:**
- Modify: `app/src/middleware.ts`

### Step 1: Read current middleware

```bash
cat src/middleware.ts
```

Expected: See current middleware with tenant checks

### Step 2: Simplify middleware (remove tenant logic)

Edit `app/src/middleware.ts` - replace entire file:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/access-denied',
    '/privacy',
    '/service',
  ];

  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/webhooks'));

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes - redirect to sign-in if not authenticated
  if (!isPublicRoute && !user) {
    const redirectUrl = new URL('/sign-in', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Add user ID header for authenticated requests
  if (user) {
    response.headers.set('x-user-id', user.id);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

Expected: Middleware simplified - tenant checks removed, auth flow preserved

### Step 3: Verify no imports of tenant.ts

```bash
grep -r "from.*tenant" src/
```

Expected: Should show no results (or only the file we just edited if not yet saved)

### Step 4: Commit middleware update

```bash
git add src/middleware.ts
git commit -m "refactor: simplify middleware - remove multi-tenant logic

- Remove subdomain detection
- Remove tenant context passing
- Keep authentication flow (protect routes, user ID header)
- Single-tenant architecture

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Middleware changes committed

---

## Task 4: Text Rebranding - Package Files

**Files:**
- Modify: `app/package.json`
- Modify: `app/public/manifest.json`

### Step 1: Update package.json name

Edit `app/package.json` - change line 2:
```json
  "name": "zuzu-codes-platform",
```

Expected: Package name updated

### Step 2: Update manifest.json

Edit `app/public/manifest.json` - replace entire file:
```json
{
  "name": "zuzu.codes",
  "short_name": "zuzu.codes",
  "description": "AI-native upskilling for modern professionals",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#fdfcfb",
  "theme_color": "#5b21b6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Expected: App manifest updated with zuzu.codes branding

### Step 3: Commit package updates

```bash
git add package.json public/manifest.json
git commit -m "chore: rebrand package and manifest to zuzu.codes

- Update package name to zuzu-codes-platform
- Update PWA manifest with zuzu.codes branding
- Preserve purple theme color

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Package files committed

---

## Task 5: Text Rebranding - Global Search & Replace

**Files:**
- Modify: Multiple files across `app/src/`

### Step 1: Find all "Lyzr Academy" references

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
grep -r "Lyzr Academy" src/ --include="*.tsx" --include="*.ts" | wc -l
```

Expected: Shows count of files to update

### Step 2: Replace "Lyzr Academy" with "zuzu.codes"

```bash
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i '' 's/Lyzr Academy/zuzu.codes/g' {} +
```

Expected: All references replaced

### Step 3: Replace "lyzr.academy" domain

```bash
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i '' 's/lyzr\.academy/zuzu.codes/g' {} +
```

Expected: Domain references updated

### Step 4: Replace "lyzr-academy" slug

```bash
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i '' 's/lyzr-academy/zuzu-codes/g' {} +
```

Expected: Slug references updated

### Step 5: Verify replacements

```bash
grep -r "Lyzr Academy" src/ --include="*.tsx" --include="*.ts"
grep -r "lyzr\.academy" src/ --include="*.tsx" --include="*.ts"
```

Expected: Should show no results

### Step 6: Check for any remaining "lyzr" references (case-insensitive)

```bash
grep -ri "lyzr" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

Expected: Review output - may show some comments or variable names that need manual review

### Step 7: Commit text rebranding

```bash
git add src/
git commit -m "refactor: global text rebrand from Lyzr Academy to zuzu.codes

- Replace 'Lyzr Academy' → 'zuzu.codes'
- Replace 'lyzr.academy' → 'zuzu.codes'
- Replace 'lyzr-academy' → 'zuzu-codes'

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Text rebranding committed

---

## Task 6: Update CLAUDE.md

**Files:**
- Modify: `app/CLAUDE.md`

### Step 1: Rewrite CLAUDE.md

Edit `app/CLAUDE.md` - replace entire file:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zuzu.codes** — An AI-native upskilling platform for modern professionals.

Focus areas: Personal productivity automation, business operations optimization.

Built with Next.js 16 (App Router), Supabase Auth (magic link), Neon Postgres.

---

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
npm start        # Start production server
```

---

## Architecture

### Authentication Flow

Supabase Auth with magic link (passwordless):
- `src/components/providers/auth-provider.tsx`: Client-side auth context with `useAuth()` hook
- `src/lib/supabase-auth.ts`: Server-side Supabase client (uses `next/headers`)
- `src/lib/supabase-client.ts`: Browser Supabase client (singleton)
- `src/app/auth/callback/route.ts`: Magic link callback handler
- Middleware protects `/dashboard/*`, `/learn/*`, `/account/*` routes

### User Model

Single-tenant architecture:
- `users` table linked to `auth.users` via UUID
- Auto-created via database trigger on signup
- No organization/tenant separation

### Data Model

```
courses
  └── modules (ordered)
        ├── mdx_content (TEXT, sections separated by \n---\n)
        └── quiz_form (JSONB)
```

**Modules** are the core content unit:
- `mdx_content`: Markdown sections separated by `\n---\n`
- `quiz_form`: JSONB quiz structure
- `section_count`: Number of lesson sections
- Each section represents one lesson

**Progress tracking**:
- `user_progress` tracks completion by (user_id, module_id, section_index)
- `section_index` is 0-based index of lesson section
- `section_index IS NULL` indicates quiz attempt
- Quiz rows include `score_percent` and `passed` fields

### Content Validation

`module_schema` table defines validation rules for MDX and quizzes:
- MDX rules: allowed elements, section limits, character limits
- Quiz rules: required fields, question limits, passing scores
- Schema versioning with `is_active` flag

Key functions:
- `getActiveSchema()`: Fetch active schema (React.cache'd)
- `validateMdxContent()`: Validate MDX structure
- `validateQuizForm()`: Validate quiz JSONB
- `validateModuleContent()`: Combined validation

### Key Patterns

- **React.cache()**: Deduplicate data fetches within render pass
- **Server Components**: Dashboard pages are RSC; client components use `"use client"`
- **Parallel fetching**: `Promise.all()` for concurrent data loads
- **API auth pattern**: `createServerSupabase()` → verify user → `getAdminClient()` for mutations

### Data Fetching Layer

All functions use `React.cache()` for deduplication.

Batch RPC functions eliminate N+1 queries:
- `get_course_progress_percent(p_user_id, p_course_id)`
- `get_batch_course_progress(p_user_id, p_course_ids[])`
- `get_batch_module_completion_status(p_user_id, p_module_ids[])`

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/progress/lesson` | POST/DELETE | Mark lesson complete/incomplete |
| `/api/quiz/submit` | POST/DELETE | Submit quiz / reset |
| `/api/internal/courses` | GET/POST | List/create courses |
| `/api/internal/courses/[id]` | GET/PUT/DELETE | Get/update/delete course |
| `/api/internal/modules` | GET/POST | List/create modules |
| `/api/internal/modules/[id]` | GET/PUT/DELETE | Get/update/delete module |
| `/api/internal/module-schema` | GET/POST | Manage validation schemas |
| `/auth/callback` | GET | Magic link callback |

---

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **Database**: Neon Postgres with Drizzle ORM
- **UI**: shadcn/ui (new-york) + Tailwind CSS v4
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React

---

## Environment Variables

Required:
- `DATABASE_URL` (Neon Postgres)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET` (service role key)
- `NEXT_PUBLIC_ROOT_DOMAIN` (zuzu.codes)
- `NEXT_PUBLIC_APP_URL` (https://zuzu.codes)

---

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`)

---

## Content Management

1. **Create course**: POST `/api/internal/courses`
2. **Create module**: POST `/api/internal/modules` with `mdx_content` and optional `quiz_form`
3. **Validation**: All content validated against active `module_schema`
4. **Progress**: Users complete sections and quizzes via `/api/progress/*` and `/api/quiz/*`
```

Expected: CLAUDE.md rewritten for zuzu.codes

### Step 2: Commit CLAUDE.md update

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for zuzu.codes platform

- Update project overview and description
- Remove multi-tenant/tracks references
- Clarify single-tenant architecture
- Update commands and tech stack

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Documentation committed

---

## Task 7: Landing Page - Hero Section

**Files:**
- Modify: `app/src/components/landing/hero-section.tsx`
- Reference: `/Users/harshitchoudhary/Documents/projects/zuzucodes/brochure.md`

### Step 1: Read brochure for content

```bash
cat /Users/harshitchoudhary/Documents/projects/zuzucodes/brochure.md | head -20
```

Expected: See hero content: "AI-Native Upskilling for the Modern Professional"

### Step 2: Update hero section

Edit `app/src/components/landing/hero-section.tsx` - replace with:

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-purple-50 to-white py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            AI-Native Upskilling for the Modern Professional
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Master AI-native automation thinking with our cohort-based learning platform.
            Complete the quadrant. Build lasting competence.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/sign-up">Start Learning</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#courses">View Courses</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Expected: Hero section updated with zuzu.codes copy

### Step 3: Verify component compiles

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit
```

Expected: No type errors

### Step 4: Commit hero section

```bash
git add src/components/landing/hero-section.tsx
git commit -m "feat: update hero section for zuzu.codes branding

- New headline: 'AI-Native Upskilling for the Modern Professional'
- Updated value proposition copy
- Preserve component structure and styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Hero section committed

---

## Task 8: Landing Page - Create Shift Section

**Files:**
- Create: `app/src/components/landing/shift-section.tsx`

### Step 1: Create shift section component

Create `app/src/components/landing/shift-section.tsx`:

```typescript
export function ShiftSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The Shift
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-8 text-gray-600">
            <p>
              AI-native tools are no longer optional. They're the new professional baseline.
            </p>
            <p>
              But there's a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches
              AI-native operations thinking — the instinct to identify, design, and manage
              automated processes.
            </p>
            <p>
              Surface-level tool familiarity isn't enough. The professionals who master
              AI-native automation management become force multipliers — personally and
              organizationally.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Expected: New section created

### Step 2: Verify component compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Commit shift section

```bash
git add src/components/landing/shift-section.tsx
git commit -m "feat: add shift section to landing page

Content from brochure.md - explains the AI skills gap and
the need for operations thinking beyond tool familiarity.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Component committed

---

## Task 9: Landing Page - Create Method Section

**Files:**
- Create: `app/src/components/landing/method-section.tsx`

### Step 1: Create method section with 4-quadrant diagram

Create `app/src/components/landing/method-section.tsx`:

```typescript
export function MethodSection() {
  return (
    <section className="bg-gray-50 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center">
            The Zuzu Method
          </h2>
          <p className="mt-4 text-lg text-gray-600 text-center">
            We don't teach tools. We build instincts.
          </p>
          <p className="mt-2 text-lg text-gray-600 text-center">
            Every topic traverses four quadrants — a complete learning cycle that produces
            deep, transferable competence.
          </p>

          {/* 4-Quadrant Diagram */}
          <div className="mt-12 grid grid-cols-2 gap-px bg-gray-300 overflow-hidden rounded-lg shadow-lg">
            <div className="bg-white p-6">
              <div className="text-sm font-semibold text-purple-600 mb-2">
                THEORETICAL × INDEPENDENT
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Core Theory
              </h3>
              <p className="text-gray-600">
                Principles and mental models that transfer
              </p>
            </div>
            <div className="bg-white p-6">
              <div className="text-sm font-semibold text-purple-600 mb-2">
                THEORETICAL × GUIDED
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Pattern Recognition
              </h3>
              <p className="text-gray-600">
                Real-world cases with expert analysis
              </p>
            </div>
            <div className="bg-white p-6">
              <div className="text-sm font-semibold text-purple-600 mb-2">
                APPLIED × INDEPENDENT
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Independent Application
              </h3>
              <p className="text-gray-600">
                Build it yourself, make mistakes, learn
              </p>
            </div>
            <div className="bg-white p-6">
              <div className="text-sm font-semibold text-purple-600 mb-2">
                APPLIED × GUIDED
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Expert Guidance
              </h3>
              <p className="text-gray-600">
                Feedback and refinement from practitioners
              </p>
            </div>
          </div>

          {/* Why It Works */}
          <div className="mt-12 bg-purple-50 rounded-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Why this works:
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Theory without application fades. Application without theory is imitation.
              Independence without guidance plateaus. Guidance without independence creates dependency.
            </p>
            <p className="text-gray-700 mt-4 font-semibold">
              Complete the quadrant. Build lasting competence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Expected: Method section with 4-quadrant visual created

### Step 2: Verify component compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Commit method section

```bash
git add src/components/landing/method-section.tsx
git commit -m "feat: add method section with 4-quadrant learning model

Visualizes the zuzu.codes approach: theory/applied × independent/guided.
Explains why completing all four quadrants builds lasting competence.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Component committed

---

## Task 10: Landing Page - Create Audience Section

**Files:**
- Create: `app/src/components/landing/audience-section.tsx`

### Step 1: Create audience section

Create `app/src/components/landing/audience-section.tsx`:

```typescript
import { Briefcase, TrendingUp, Users, FileSpreadsheet } from 'lucide-react';

export function AudienceSection() {
  const audiences = [
    {
      icon: TrendingUp,
      title: 'Career-focused professionals',
      description: 'Seeking AI-native skills that compound over time',
    },
    {
      icon: Briefcase,
      title: 'Founders and operators',
      description: 'Who treat productivity as competitive advantage',
    },
    {
      icon: Users,
      title: 'Team leads',
      description: 'Building automation-first cultures',
    },
    {
      icon: FileSpreadsheet,
      title: 'Consultants',
      description: 'Adding process optimization to their practice',
    },
  ];

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Who This Is For
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Like an MBA provides frameworks for business thinking, this curriculum provides
            frameworks for AI-native operations thinking.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2">
            {audiences.map((audience, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-lg border border-gray-200 p-6 hover:border-purple-300 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                    <audience.icon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {audience.title}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {audience.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

Expected: Audience section with 4 personas created

### Step 2: Verify component compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Commit audience section

```bash
git add src/components/landing/audience-section.tsx
git commit -m "feat: add audience section with target personas

Four key audiences: professionals, founders, team leads, consultants.
Icons from lucide-react, purple theme accents.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Component committed

---

## Task 11: Landing Page - Create Courses Section

**Files:**
- Create: `app/src/components/landing/courses-section.tsx`

### Step 1: Create courses section

Create `app/src/components/landing/courses-section.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CoursesSection() {
  const courses = [
    {
      title: 'Course 1: Personal Productivity',
      tagline: 'From manual processes and fragmented tools → to systematized personal operations that run themselves.',
      modules: [
        {
          name: 'First Principles',
          description: 'How automation thinks',
          lessons: [
            'Introduction to Workflow Thinking',
            'Your First Automation',
            'Connecting Services',
            'Working with Data',
          ],
        },
        {
          name: 'Building Blocks',
          description: 'The patterns behind every workflow',
          lessons: [
            'Triggers and Schedules',
            'When Things Go Wrong',
            'Complex Data Structures',
            'Processing Different Formats',
          ],
        },
        {
          name: 'Production Ready',
          description: 'From working to reliable',
          lessons: [
            'Building Resilient Workflows',
            'Multi-Step Architectures',
            'Monitoring What You Build',
            'Going to Production',
          ],
        },
      ],
      outcome: 'A personal operating system of automated workflows. Instincts for identifying and systematizing any process. Fluency with modern automation tools and patterns.',
    },
    {
      title: 'Course 2: Business Operations',
      tagline: 'From individual automation competence → to organizational capability across teams and systems.',
      modules: [
        {
          name: 'Process Design',
          description: 'From business need to automation blueprint',
          lessons: [
            'Mapping Processes',
            'Finding Automation Opportunities',
            'Building the Business Case',
            'Designing for Scale',
          ],
        },
        {
          name: 'Enterprise Integrations',
          description: 'Connecting the systems that run your business',
          lessons: [
            'CRM Workflows',
            'Finance and Operations',
            'Working with Databases',
            'Communication Flows',
          ],
        },
        {
          name: 'Production & Compliance',
          description: 'Automations that organizations can trust',
          lessons: [
            'Security and Access',
            'Audit and Recovery',
            'Performance at Scale',
            'Maintenance and Evolution',
          ],
        },
      ],
      outcome: 'Process design methodology for any scale. Cross-functional integration skills. Operations governance instincts.',
    },
  ];

  return (
    <section id="courses" className="bg-gray-50 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The Courses
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-5xl space-y-12">
          {courses.map((course, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
            >
              <h3 className="text-2xl font-bold text-gray-900">
                {course.title}
              </h3>
              <p className="mt-2 text-lg text-gray-600 italic">
                {course.tagline}
              </p>

              <div className="mt-8 space-y-6">
                {course.modules.map((module, moduleIdx) => (
                  <div key={moduleIdx}>
                    <h4 className="font-semibold text-lg text-gray-900">
                      Module {moduleIdx + 1}: {module.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {module.description}
                    </p>
                    <ul className="ml-4 space-y-1 text-gray-700">
                      {module.lessons.map((lesson, lessonIdx) => (
                        <li key={lessonIdx} className="text-sm">
                          • {lesson}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg bg-purple-50 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  You'll develop:
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {course.outcome}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link href="/sign-up">Enroll Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

Expected: Courses section with full curriculum created

### Step 2: Verify component compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Commit courses section

```bash
git add src/components/landing/courses-section.tsx
git commit -m "feat: add courses section with full curriculum

Two courses: Personal Productivity, Business Operations.
Each with 3 modules and lesson breakdowns from brochure.md.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Component committed

---

## Task 12: Landing Page - Create Pricing Section

**Files:**
- Create: `app/src/components/landing/pricing-section.tsx`

### Step 1: Create pricing section

Create `app/src/components/landing/pricing-section.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const tiers = [
    {
      name: 'Essential',
      quadrants: {
        'Core Theory': 'Self-paced',
        'Pattern Recognition': 'Library',
        'Independent Application': 'Self-directed',
        'Expert Guidance': 'Community',
      },
    },
    {
      name: 'Pro',
      recommended: true,
      quadrants: {
        'Core Theory': 'Enhanced',
        'Pattern Recognition': '+ Live sessions',
        'Independent Application': '+ Structured',
        'Expert Guidance': '+ Instructor-led',
      },
    },
    {
      name: 'Premium',
      quadrants: {
        'Core Theory': 'Deep',
        'Pattern Recognition': '+ Expert commentary',
        'Independent Application': '+ Personalized',
        'Expert Guidance': '+ 1:1 mentorship',
      },
    },
  ];

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Cohort-based learning. Fixed timelines, peer accountability, structured progression.
          </p>
          <p className="mt-2 text-gray-600">
            Three tiers — progressive quadrant depth.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-8 ${
                tier.recommended
                  ? 'border-purple-600 shadow-lg ring-2 ring-purple-600'
                  : 'border-gray-200'
              }`}
            >
              {tier.recommended && (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
                    Recommended
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900">
                {tier.name}
              </h3>

              <div className="mt-6 space-y-4">
                {Object.entries(tier.quadrants).map(([quadrant, depth]) => (
                  <div key={quadrant} className="flex gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {quadrant}
                      </p>
                      <p className="text-sm text-gray-600">{depth}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="mt-8 w-full"
                variant={tier.recommended ? 'default' : 'outline'}
                asChild
              >
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-gray-600">
          Higher tiers = deeper engagement at each stage.
        </p>
        <p className="mt-2 text-center text-gray-600">
          Bundle and early bird options available.
        </p>
      </div>
    </section>
  );
}
```

Expected: Pricing section with three tiers created

### Step 2: Verify component compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Commit pricing section

```bash
git add src/components/landing/pricing-section.tsx
git commit -m "feat: add pricing section with three tiers

Essential, Pro (recommended), Premium.
Maps quadrant depth to each tier from brochure.md.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Component committed

---

## Task 13: Landing Page - Update Header and Footer

**Files:**
- Modify: `app/src/components/landing/header.tsx`
- Modify: `app/src/components/landing/footer.tsx`

### Step 1: Read current header

```bash
cat src/components/landing/header.tsx | head -30
```

Expected: See current header structure

### Step 2: Update header with zuzu.codes branding

Edit `app/src/components/landing/header.tsx` - update logo/brand text to "zuzu.codes":

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-purple-600">zuzu.codes</span>
        </Link>

        <nav className="hidden md:flex gap-6">
          <Link
            href="#courses"
            className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
          >
            Courses
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

Expected: Header updated with zuzu.codes branding

### Step 3: Update footer

Edit `app/src/components/landing/footer.tsx` - update to zuzu.codes:

```typescript
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-purple-600">zuzu.codes</h3>
            <p className="mt-2 text-sm text-gray-600">
              AI-native upskilling for modern professionals
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#courses" className="text-gray-600 hover:text-purple-600">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-gray-600 hover:text-purple-600">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-purple-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/service" className="text-gray-600 hover:text-purple-600">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          <p>Questions? WhatsApp: +91 80118 58376</p>
          <p className="mt-2">© 2026 zuzu.codes. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

Expected: Footer updated with contact info from brochure

### Step 4: Verify components compile

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 5: Commit header and footer updates

```bash
git add src/components/landing/header.tsx src/components/landing/footer.tsx
git commit -m "feat: update header and footer for zuzu.codes

- Update logo to 'zuzu.codes'
- Simplify navigation (Courses, Pricing)
- Add WhatsApp contact from brochure.md
- Update copyright and description

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Header/footer committed

---

## Task 14: Landing Page - Update Main Page

**Files:**
- Modify: `app/src/app/page.tsx`

### Step 1: Update landing page composition

Edit `app/src/app/page.tsx` - replace with new sections:

```typescript
import { createServerSupabase } from "@/lib/supabase-auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { ShiftSection } from "@/components/landing/shift-section";
import { MethodSection } from "@/components/landing/method-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated users go to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Unauthenticated users see landing page
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <ShiftSection />
        <MethodSection />
        <AudienceSection />
        <CoursesSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
```

Expected: Main page updated with new section order

### Step 2: Remove old landing components

```bash
rm src/components/landing/features-section.tsx
rm src/components/landing/testimonials-section.tsx
rm src/components/landing/how-it-works-section.tsx
rm src/components/landing/cta-section.tsx
```

Expected: Unused components removed (or "No such file" if already gone)

### Step 3: Verify page compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 4: Commit landing page update

```bash
git add src/app/page.tsx
git add -A src/components/landing/
git commit -m "feat: rebuild landing page with zuzu.codes sections

New flow: Hero → Shift → Method → Audience → Courses → Pricing
Removed: Features, Testimonials, How It Works, CTA sections
All content from brochure.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Landing page rebuild committed

---

## Task 15: Database Schema - Create Initial Migration

**Files:**
- Create: `app/supabase/migrations/20260215000001_initial_schema.sql`

### Step 1: Create initial schema migration

Create `app/supabase/migrations/20260215000001_initial_schema.sql`:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modules table
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  mdx_content TEXT,
  quiz_form JSONB,
  section_count INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- User progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_index INTEGER, -- NULL for quiz attempts
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_percent INTEGER, -- For quizzes
  passed BOOLEAN, -- For quizzes
  UNIQUE(user_id, module_id, section_index)
);

-- Module schema validation table
CREATE TABLE module_schema (
  version TEXT PRIMARY KEY,
  mdx_rules JSONB NOT NULL,
  quiz_rules JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_modules_course_id ON modules(course_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX idx_module_schema_active ON module_schema(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_schema ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Anyone can read published courses
CREATE POLICY "Anyone can read published courses"
  ON courses FOR SELECT
  USING (is_published = true);

-- Anyone can read modules (will check course publish status in queries)
CREATE POLICY "Anyone can read modules"
  ON modules FOR SELECT
  USING (true);

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
  ON user_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read active module schema
CREATE POLICY "Anyone can read module schema"
  ON module_schema FOR SELECT
  USING (true);

-- Function: Get course progress percentage
CREATE OR REPLACE FUNCTION get_course_progress_percent(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  -- Calculate total items (sections + quizzes) across all modules in course
  SELECT SUM(
    section_count + CASE WHEN quiz_form IS NOT NULL THEN 1 ELSE 0 END
  )
  INTO total_items
  FROM modules
  WHERE course_id = p_course_id;

  -- If no items, return 0
  IF total_items IS NULL OR total_items = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed items
  SELECT COUNT(DISTINCT (module_id, section_index))
  INTO completed_items
  FROM user_progress
  WHERE user_id = p_user_id
    AND module_id IN (SELECT id FROM modules WHERE course_id = p_course_id)
    AND (
      section_index IS NOT NULL -- Completed lesson
      OR (section_index IS NULL AND passed = true) -- Passed quiz
    );

  -- Return percentage
  RETURN (completed_items * 100 / total_items);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get batch course progress
CREATE OR REPLACE FUNCTION get_batch_course_progress(
  p_user_id UUID,
  p_course_ids UUID[]
)
RETURNS TABLE(course_id UUID, progress_percent INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(p_course_ids) AS course_id,
    get_course_progress_percent(p_user_id, unnest(p_course_ids)) AS progress_percent;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get batch module completion status
CREATE OR REPLACE FUNCTION get_batch_module_completion_status(
  p_user_id UUID,
  p_module_ids UUID[]
)
RETURNS TABLE(
  module_id UUID,
  completed_sections INTEGER,
  total_sections INTEGER,
  quiz_passed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS module_id,
    COALESCE(
      (SELECT COUNT(*)
       FROM user_progress up
       WHERE up.user_id = p_user_id
         AND up.module_id = m.id
         AND up.section_index IS NOT NULL),
      0
    )::INTEGER AS completed_sections,
    m.section_count AS total_sections,
    (SELECT passed
     FROM user_progress up
     WHERE up.user_id = p_user_id
       AND up.module_id = m.id
       AND up.section_index IS NULL
     LIMIT 1) AS quiz_passed
  FROM modules m
  WHERE m.id = ANY(p_module_ids);
END;
$$ LANGUAGE plpgsql STABLE;
```

Expected: Initial schema migration created

### Step 2: Verify SQL syntax (optional - requires local Postgres)

```bash
# If you have psql installed locally, you can check syntax:
# psql -d test_db -f supabase/migrations/20260215000001_initial_schema.sql --dry-run
# Otherwise, skip this step - will verify on actual Neon DB
```

Expected: No syntax errors (or skip if no local Postgres)

### Step 3: Commit migration

```bash
git add supabase/migrations/20260215000001_initial_schema.sql
git commit -m "feat: create initial database schema for zuzu.codes

Core tables:
- users (linked to auth.users)
- courses (title, slug, description, order)
- modules (mdx_content, quiz_form, section_count)
- user_progress (lesson sections and quiz attempts)
- module_schema (content validation rules)

RLS policies for data security.
Functions for progress calculation and batch queries.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Migration committed

---

## Task 16: Update Database Connection

**Files:**
- Create: `app/src/lib/db.ts`
- Modify: `app/src/lib/supabase.ts` (if needed for Neon connection)

### Step 1: Create Neon database connection utility

Create `app/src/lib/db.ts`:

```typescript
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = neon(process.env.DATABASE_URL);
```

Expected: Database connection utility created

### Step 2: Install Neon serverless driver

```bash
npm install @neondatabase/serverless
```

Expected: Package installed

### Step 3: Verify TypeScript compiles

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 4: Commit database connection

```bash
git add src/lib/db.ts package.json package-lock.json
git commit -m "feat: add Neon database connection

Install @neondatabase/serverless for edge-compatible Postgres access.
Create db.ts utility for running SQL queries.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Database connection committed

---

## Task 17: Run Migrations on Development Database

**Files:**
- Reference: `app/supabase/migrations/20260215000001_initial_schema.sql`

### Step 1: Connect to Neon development branch

Get the development branch connection string:
```bash
neonctl connection-string development --project-id <your-project-id>
```

Expected: Connection string displayed

### Step 2: Run migration on development database

Using the connection string from step 1:
```bash
psql "<connection-string>" -f supabase/migrations/20260215000001_initial_schema.sql
```

Expected: Tables and functions created successfully

### Step 3: Verify tables exist

```bash
psql "<connection-string>" -c "\dt"
```

Expected: Shows users, courses, modules, user_progress, module_schema tables

### Step 4: Verify functions exist

```bash
psql "<connection-string>" -c "\df get_course_progress_percent"
```

Expected: Shows function definition

### Step 5: Document migration applied

No git commit needed - this is database state, not code.

Expected: Development database ready for testing

---

## Task 18: Local Testing - Build and Run

**Files:**
- Reference: `app/.env.local`

### Step 1: Install dependencies

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npm install
```

Expected: Dependencies installed

### Step 2: Build the application

```bash
npm run build
```

Expected: Build succeeds with no errors

### Step 3: Start development server

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

### Step 4: Verify landing page loads

Open browser to http://localhost:3000

Expected:
- Page loads without errors
- New sections visible: Hero, Shift, Method, Audience, Courses, Pricing
- No references to "Lyzr Academy" visible
- Console shows no errors about tenant/subdomain

### Step 5: Test sign-up flow

1. Click "Get Started" or "Sign Up"
2. Enter email
3. Submit

Expected:
- Magic link sent
- No errors about missing tenant
- Supabase auth flow works

### Step 6: Stop dev server

Press Ctrl+C

Expected: Server stopped

---

## Task 19: Deploy to Vercel

**Files:**
- Reference: Infrastructure setup from Task 1

### Step 1: Push all changes to GitHub

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
git push origin main
```

Expected: All commits pushed to GitHub

### Step 2: Trigger Vercel deployment

```bash
vercel --prod
```

Or wait for automatic deployment from GitHub push.

Expected: Deployment started

### Step 3: Run migrations on production database

Get production connection string:
```bash
neonctl connection-string main --project-id <your-project-id>
```

Run migration:
```bash
psql "<production-connection-string>" -f supabase/migrations/20260215000001_initial_schema.sql
```

Expected: Production database schema created

### Step 4: Verify deployment

Visit https://zuzu.codes

Expected:
- Site loads successfully
- Landing page displays correctly
- No "Lyzr Academy" references
- Sign-up flow works

### Step 5: Check Vercel logs

```bash
vercel logs --prod
```

Expected: No errors in logs

---

## Task 20: Final Verification

**Files:**
- Reference: `docs/plans/2026-02-15-zuzu-rebrand-design.md` (verification checklist)

### Step 1: Search for remaining "Lyzr Academy" references

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
grep -r "Lyzr Academy" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```

Expected: No results (or only in git history/node_modules)

### Step 2: Search for "lyzr.academy" domain references

```bash
grep -r "lyzr\.academy" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```

Expected: No results

### Step 3: Verify environment variables

```bash
vercel env ls
```

Expected:
- DATABASE_URL set
- NEXT_PUBLIC_ROOT_DOMAIN = zuzu.codes
- NEXT_PUBLIC_APP_URL = https://zuzu.codes
- Supabase keys configured

### Step 4: Test complete user journey

On https://zuzu.codes:
1. Land on homepage ✓
2. See new sections (Shift, Method, Audience, Courses, Pricing) ✓
3. Sign up with magic link ✓
4. Verify email and authenticate ✓
5. Redirect to /dashboard ✓
6. See empty state (no courses yet) ✓

Expected: Complete flow works without errors

### Step 5: Check browser console

Open DevTools console on https://zuzu.codes

Expected:
- No errors about tenant detection
- No 404s for missing files
- No references to old domain

### Step 6: Verify GitHub repo

Visit https://github.com/zuzucodes/platform

Expected:
- Commits visible
- README can be updated (optional)
- Code matches deployed site

### Step 7: Document completion

Create a summary comment or update README if desired.

Expected: Rebrand complete and verified

---

## Summary

This implementation plan converts Lyzr Academy to zuzu.codes through:

1. **Infrastructure** - New GitHub repo, Neon DB, Vercel deployment
2. **Cleanup** - Remove multi-tenant code, old migrations, tenant utilities
3. **Rebranding** - Global text replace, update configs and manifests
4. **Landing Page** - Six new sections based on brochure.md
5. **Database** - Fresh schema with core LMS tables and RLS
6. **Testing** - Local verification and production deployment
7. **Verification** - Complete checklist validation

**Next Steps After This Plan:**
- Add actual course content via internal APIs
- Customize landing page styling/animations
- Set up analytics and monitoring
- Configure email templates for magic links
- Add more sophisticated pricing/payment integration
