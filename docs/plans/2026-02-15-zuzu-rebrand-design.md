# zuzu.codes Rebrand Design

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Infrastructure-First Sequential

---

## Overview

Rebrand Lyzr Academy learning platform to zuzu.codes - an AI-native upskilling platform focused on automation and productivity. This involves creating fresh infrastructure, simplifying architecture to single-tenant, rebuilding the landing page, and removing all Lyzr Academy references.

---

## Key Decisions

1. **Architecture:** Single-tenant only (remove multi-tenant/subdomain support)
2. **Database:** Fresh Neon Postgres with core schema only (no seed data)
3. **Landing Page:** Replace with brochure.md content (new sections)
4. **Features:** Keep full LMS feature set, remove tracks and multi-tenant
5. **Branding:** Keep purple theme, update all text references
6. **Setup:** Use gh, neonctl, and vercel CLI for infrastructure

---

## Infrastructure Setup

### GitHub Repository
- **Repo:** `zuzucodes/platform` (private)
- Clean main branch, no git history from Lyzr Academy
- Branch protection on main

**Commands:**
```bash
gh repo create zuzucodes/platform --private --description "zuzu.codes learning platform"
```

### Neon Database
- **Project:** `zuzu-codes`
- Fresh connection string for environment variables
- Can branch for dev environment if needed

**Commands:**
```bash
neonctl projects create --name zuzu-codes
```

### Vercel Project
- Link to GitHub repo
- Connect existing zuzu.codes domain
- Environment variables: DATABASE_URL, NEXT_PUBLIC_ROOT_DOMAIN, NEXT_PUBLIC_APP_URL

**Commands:**
```bash
vercel link
vercel domains add zuzu.codes
vercel env pull .env.local
```

---

## Code Cleanup

### Files/Directories to Remove
- `app/src/lib/tenant.ts` - Multi-tenant subdomain detection
- `app/scripts/notion-export/` - Lyzr Academy content exports
- `app/supabase/migrations/` - All ~40 existing migrations
- `app/docs/` - Old planning docs (if any)

### Features to Remove
- Multi-tenant middleware logic
- Subdomain routing/detection
- "Tracks" functionality (use courses directly)
- Organization/tenant tables and references
- Tenant-based database filtering

### Files to Update
- `app/src/middleware.ts` - Remove subdomain checks
- `app/src/app/layout.tsx` - Remove tenant-specific metadata
- Database queries - Remove tenant_id/org_id filters
- `app/.env.local.example` - Update to zuzu.codes domains
- `app/public/manifest.json` - Update app name/description
- `app/CLAUDE.md` - Rewrite for zuzu.codes context

---

## Text Rebranding

### Global Find & Replace
- `Lyzr Academy` → `zuzu.codes`
- `lyzr.academy` → `zuzu.codes`
- `lyzr-academy` → `zuzu-codes`
- `LYZR` → `ZUZU` (in constants)

### Specific Updates
- `app/package.json` - name: "zuzu-codes-platform"
- `app/public/manifest.json` - name, description, theme
- `app/CLAUDE.md` - Complete rewrite
- `app/src/app/layout.tsx` - Metadata, OG tags
- All landing page components - Content from brochure.md
- Sign-in/sign-up pages - Welcome messages

### Manual Review
- Comments referring to Lyzr platform concepts
- Variable names (if any lyzr-specific naming)
- Documentation references

---

## Landing Page Redesign

### New Section Structure
Based on brochure.md content:

1. **Header** - Logo, navigation, CTA
2. **Hero** - "AI-Native Upskilling for the Modern Professional"
3. **ShiftSection** - The problem (AI tools gap)
4. **MethodSection** - 4-quadrant learning model with diagram
5. **AudienceSection** - Who this is for (4 personas)
6. **CoursesSection** - Two courses with module breakdowns
7. **PricingSection** - Three tiers (Essential/Pro/Premium)
8. **Footer** - Contact, legal links

### Component Changes
- **Keep & Update:** `header.tsx`, `footer.tsx`
- **Replace:** `hero-section.tsx`
- **Create New:** `shift-section.tsx`, `method-section.tsx`, `audience-section.tsx`, `pricing-section.tsx`
- **Repurpose:** `features-section.tsx` → `courses-section.tsx`
- **Remove:** `testimonials-section.tsx`, `how-it-works-section.tsx`

---

## Database Schema

### Fresh Migration: `20260215000001_initial_schema.sql`

**Core Tables:**
- `users` - Linked to auth.users via UUID
- `courses` - Title, description, slug, order, metadata
- `modules` - course_id, mdx_content, quiz_form, section_count, order
- `user_progress` - user_id, module_id, section_index, completed_at, score_percent, passed
- `module_schema` - Validation rules for content (MDX/quiz)

**What's Excluded:**
- Tracks table (removed - use courses directly)
- Organizations/tenants (single-tenant architecture)
- Pre-seeded content (add via CMS later)

**RLS Policies:**
- Users can read all courses/modules
- Users can only access their own progress
- Service role bypasses for admin operations

**Functions:**
- `get_course_progress_percent(user_id, course_id)`
- `get_batch_course_progress(user_id, course_ids[])`
- `get_batch_module_completion_status(user_id, module_ids[])`

---

## Testing & Deployment

### Local Testing
1. Set up Neon dev branch with fresh schema
2. Run migrations locally
3. Verify all pages load without tenant errors
4. Test auth flow (magic link signup/signin)
5. Create test course via internal API
6. Verify learner dashboard functionality

### Deployment Flow
1. Push to GitHub (triggers Vercel preview)
2. Verify preview deployment
3. Run migrations on production Neon DB
4. Merge to main (production deployment)
5. Verify zuzu.codes domain

### Verification Checklist
- [ ] All "Lyzr Academy" references removed
- [ ] Landing page renders with brochure.md content
- [ ] Auth works (sign-up, sign-in, magic link)
- [ ] Dashboard accessible for authenticated users
- [ ] No console errors about tenants/subdomains
- [ ] Database migrations run cleanly
- [ ] All environment variables configured
- [ ] Domain resolves to production site

---

## What We're Building

**Core Changes:**
- Fresh infrastructure (GitHub, Neon, Vercel)
- Single-tenant architecture (simplified)
- New landing page (from brochure.md)
- Complete text rebrand
- Fresh database schema

**What Stays:**
- Full LMS features (courses, lessons, quizzes, progress)
- Magic link authentication
- Internal content management APIs
- Dashboard and learner experience
- Purple theme (just update text)

---

## Timeline & Approach

**Approach A: Infrastructure-First Sequential**

1. Set up infrastructure (GitHub, Neon, Vercel)
2. Clean the app directory (remove multi-tenant, old migrations)
3. Rebrand all text/references
4. Rebuild landing page components
5. Create fresh migrations
6. Test locally and deploy

This sequential approach provides clean separation of concerns and allows verification at each step.
