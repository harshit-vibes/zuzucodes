# Dashboard Tracks + Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the dashboard with a track-row layout (courses grouped by tag as horizontal scroll rows) and add a `/roadmap` page with upvote-driven idea log.

**Architecture:** `courses.tag` acts as track identifier — no new DB table. Dashboard groups courses client-side into track sections. `/roadmap` is a standalone route backed by two new tables (`roadmap_items`, `roadmap_votes`). "New" badge is powered by a `published_at` column added to `courses`.

**Tech Stack:** Next.js 16 App Router, Neon PostgreSQL (`@neondatabase/serverless` raw SQL), Tailwind CSS v4, shadcn/ui, `auth()` from `@/lib/auth/server`, `authClient` from `@/lib/auth/client`.

---

## Context

- **Design doc:** `docs/plans/2026-02-28-dashboard-tracks-roadmap-design.md`
- **Key data file:** `app/src/lib/data.ts` — all DB access, `React.cache()` on fetches
- **Dashboard page:** `app/src/app/dashboard/page.tsx` — currently uses `CourseGrid`, will be replaced
- **`CourseGrid`:** `app/src/components/dashboard/course-grid.tsx` — will be deleted after replacement
- **`titleCase`:** available in `@/lib/utils` — use it for track name display
- **`CourseProgress` type:** `{ courseId, progress, status: 'not_started'|'in_progress'|'completed', lastAccessed }`
- **Queries that select courses:** `getCourses` (line ~108), `getCourseWithModules` (line ~127), `getCoursesForSidebar` (line ~931) — all select the same columns, all need `published_at` added
- **No test runner configured** — verification is `npx tsc --noEmit` + visual check in `npm run dev`
- **Run migrations:** paste SQL into Neon Console SQL editor for your project

---

## Task 1: Migration — `published_at` on courses

**Files:**
- Create: `app/migrations/2026-02-28-dashboard-published-at.sql`

**Step 1: Create the migration file**

```sql
-- Add published_at to courses for "New" badge logic
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now();

-- Backdate existing courses so they don't get a spurious "New" badge on launch
UPDATE courses SET published_at = '2026-01-01' WHERE published_at IS NOT NULL;
```

**Step 2: Run in Neon Console**

Open your Neon project → SQL Editor → paste and run the SQL above.
Expected: `ALTER TABLE` + `UPDATE N` with no errors.

**Step 3: Verify**

```sql
SELECT id, title, published_at FROM courses LIMIT 5;
```
Expected: all rows have `published_at = '2026-01-01 00:00:00+00'`.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-28-dashboard-published-at.sql
git commit -m "feat: add published_at to courses for New badge"
```

---

## Task 2: Migration — roadmap tables

**Files:**
- Create: `app/migrations/2026-02-28-roadmap-tables.sql`

**Step 1: Create the migration file**

```sql
CREATE TABLE IF NOT EXISTS roadmap_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (char_length(title) <= 80),
  description  TEXT        CHECK (char_length(description) <= 300),
  status       TEXT        NOT NULL DEFAULT 'idea'
                           CHECK (status IN ('idea', 'planned', 'in_progress', 'done')),
  is_published BOOLEAN     NOT NULL DEFAULT false,
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roadmap_votes (
  user_id    TEXT        NOT NULL,
  item_id    UUID        NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS roadmap_votes_item_id_idx ON roadmap_votes(item_id);
```

**Step 2: Run in Neon Console**

Expected: `CREATE TABLE`, `CREATE TABLE`, `CREATE INDEX` — no errors.

**Step 3: Seed one admin item to verify**

```sql
INSERT INTO roadmap_items (title, description, status, is_published, created_by)
VALUES ('Advanced Python: Decorators & Generators', 'Deep-dive module on advanced Python patterns.', 'planned', true, 'admin');
```

Expected: `INSERT 0 1`.

**Step 4: Commit**

```bash
git add app/migrations/2026-02-28-roadmap-tables.sql
git commit -m "feat: add roadmap_items and roadmap_votes tables"
```

---

## Task 3: Update Course type + queries in data.ts

**Files:**
- Modify: `app/src/lib/data.ts`

**Step 1: Add `published_at` to the Course interface**

Find the `Course` interface (around line 25) and add the field:

```typescript
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  outcomes: string[] | null;
  tag: string | null;
  order: number;
  published_at: string | null;   // ← ADD THIS
  intro_content: unknown | null;
  outro_content: unknown | null;
  confidence_form: ConfidenceForm | null;
}
```

**Step 2: Add `published_at` to all three course SELECT queries**

There are three functions that SELECT from `courses` with the same column list. Add `published_at` to each:

1. `getCourses` (~line 108):
```sql
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       published_at, intro_content, outro_content, confidence_form, created_at
```

2. `getCourseWithModules` (~line 127):
```sql
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       published_at, intro_content, outro_content, confidence_form, created_at
```

3. `getCoursesForSidebar` (~line 931):
```sql
SELECT id, title, slug, description, thumbnail_url, outcomes, tag, "order",
       published_at, intro_content, outro_content, confidence_form, created_at
```

**Step 3: Type check**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: add published_at to Course type and queries"
```

---

## Task 4: Add roadmap types + functions to data.ts

**Files:**
- Modify: `app/src/lib/data.ts`

**Step 1: Add the `RoadmapItem` interface** (add near the top with other interfaces)

```typescript
export interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'planned' | 'in_progress' | 'done';
  created_by: string;
  created_at: string;
  vote_count: number;
  user_voted: boolean;
}
```

**Step 2: Add roadmap data functions** (add at the bottom of the file)

```typescript
// ========================================
// ROADMAP
// ========================================

/**
 * Get all published roadmap items with vote counts.
 * user_voted is true if the given userId has voted for the item.
 */
export const getRoadmapItems = cache(async (userId: string | null): Promise<RoadmapItem[]> => {
  try {
    const uid = userId ?? '';
    const rows = await sql`
      SELECT
        ri.id::text,
        ri.title,
        ri.description,
        ri.status,
        ri.created_by,
        ri.created_at,
        COUNT(rv.user_id)::int                                    AS vote_count,
        COALESCE(BOOL_OR(rv.user_id = ${uid}), false)             AS user_voted
      FROM roadmap_items ri
      LEFT JOIN roadmap_votes rv ON rv.item_id = ri.id
      WHERE ri.is_published = true
      GROUP BY ri.id
      ORDER BY COUNT(rv.user_id) DESC, ri.created_at DESC
    `;
    return rows as RoadmapItem[];
  } catch (error) {
    console.error('getRoadmapItems error:', error);
    return [];
  }
});

/**
 * Toggle a vote on a roadmap item. Returns new voted state + count.
 */
export async function toggleRoadmapVote(
  userId: string,
  itemId: string,
): Promise<{ voted: boolean; count: number }> {
  const existing = await sql`
    SELECT 1 FROM roadmap_votes WHERE user_id = ${userId} AND item_id = ${itemId}::uuid
  `;
  if (existing.length > 0) {
    await sql`DELETE FROM roadmap_votes WHERE user_id = ${userId} AND item_id = ${itemId}::uuid`;
  } else {
    await sql`INSERT INTO roadmap_votes (user_id, item_id) VALUES (${userId}, ${itemId}::uuid)`;
  }
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM roadmap_votes WHERE item_id = ${itemId}::uuid
  `;
  return { voted: existing.length === 0, count: count as number };
}

/**
 * Submit a new idea (unpublished — admin reviews before publishing).
 */
export async function submitRoadmapIdea(
  userId: string,
  title: string,
  description: string,
): Promise<void> {
  await sql`
    INSERT INTO roadmap_items (title, description, created_by, is_published)
    VALUES (${title}, ${description || null}, ${userId}, false)
  `;
}
```

**Step 3: Type check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/src/lib/data.ts
git commit -m "feat: add RoadmapItem type and roadmap data functions"
```

---

## Task 5: CourseCard component

**Files:**
- Create: `app/src/components/dashboard/course-card.tsx`

**Step 1: Create the file**

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Course, CourseProgress } from '@/lib/data';

// Tag → gradient fallback when no thumbnail
const TAG_GRADIENTS: Record<string, string> = {
  python:  'from-blue-500/20 to-cyan-500/20',
  ai:      'from-violet-500/20 to-purple-500/20',
  agents:  'from-rose-500/20 to-pink-500/20',
};
const DEFAULT_GRADIENT = 'from-primary/20 to-primary/10';

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  return new Date(publishedAt) > cutoff;
}

interface CourseCardProps {
  course: Course;
  progress: CourseProgress | undefined;
}

export function CourseCard({ course, progress }: CourseCardProps) {
  const status = progress?.status ?? 'not_started';
  const progressValue = progress?.progress ?? 0;
  const ctaLabel =
    status === 'completed' ? 'Review' :
    status === 'in_progress' ? 'Continue' :
    'Start';
  const gradient = TAG_GRADIENTS[course.tag?.toLowerCase() ?? ''] ?? DEFAULT_GRADIENT;
  const showNew = isNew(course.published_at);

  return (
    <Link
      href={`/dashboard/course/${course.slug}`}
      className="group flex-shrink-0 w-64 rounded-xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className={`relative h-36 bg-gradient-to-br ${gradient}`}>
        {course.thumbnail_url && (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover"
          />
        )}
        {showNew && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            New
          </span>
        )}
        {status === 'completed' && (
          <span className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">
            Completed
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          {course.tag && (
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1">
              {course.tag}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {course.title}
          </p>
        </div>

        {progressValue > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progressValue} className="flex-1 h-1" />
            <span className="text-[10px] font-mono text-primary tabular-nums w-7 text-right">
              {progressValue}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1 border-t border-border/40">
          <span className={cn(
            'flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-2',
            status === 'completed' ? 'text-muted-foreground' : 'text-primary',
          )}>
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/dashboard/course-card.tsx
git commit -m "feat: add CourseCard component with New badge and progress"
```

---

## Task 6: TrackSection component

**Files:**
- Create: `app/src/components/dashboard/track-section.tsx`

**Step 1: Create the file**

```tsx
import { titleCase } from '@/lib/utils';
import { CourseCard } from './course-card';
import type { Course, CourseProgress } from '@/lib/data';

interface TrackSectionProps {
  tag: string;
  courses: Course[];
  courseProgress: Record<string, CourseProgress>;
}

export function TrackSection({ tag, courses, courseProgress }: TrackSectionProps) {
  const completedCount = courses.filter(
    (c) => courseProgress[c.id]?.status === 'completed',
  ).length;
  const total = courses.length;

  return (
    <section className="space-y-3">
      {/* Track header */}
      <div className="flex items-center gap-3 px-0.5">
        <h2 className="text-sm font-semibold text-foreground">{titleCase(tag)}</h2>
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {courses.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full transition-colors ${
                i < completedCount ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {completedCount} of {total} complete
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {courses.map((course) => (
          <div key={course.id} className="snap-start">
            <CourseCard course={course} progress={courseProgress[course.id]} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/dashboard/track-section.tsx
git commit -m "feat: add TrackSection component with horizontal scroll"
```

---

## Task 7: RoadmapCTABanner component

**Files:**
- Create: `app/src/components/dashboard/roadmap-cta-banner.tsx`

**Step 1: Create the file**

```tsx
import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'lucide-react';

export function RoadmapCTABanner() {
  return (
    <Link
      href="/roadmap"
      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-5 py-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Lightbulb className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">We're building this in public</p>
        <p className="text-xs text-muted-foreground mt-0.5">Vote on what we build next</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
```

**Step 2: Commit**

```bash
git add app/src/components/dashboard/roadmap-cta-banner.tsx
git commit -m "feat: add RoadmapCTABanner component"
```

---

## Task 8: Rewrite dashboard/page.tsx

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`
- Delete: `app/src/components/dashboard/course-grid.tsx`

**Step 1: Rewrite `app/src/app/dashboard/page.tsx`**

Replace the entire file with:

```tsx
import { auth } from '@/lib/auth/server';
import {
  getDashboardStats,
  getResumeData,
  getCourses,
  getCourseWithModules,
  getUserCoursesProgress,
} from '@/lib/data';
import type { Course, CourseProgress } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TrackSection } from '@/components/dashboard/track-section';
import { RoadmapCTABanner } from '@/components/dashboard/roadmap-cta-banner';

// ── Group courses by tag, sorted by min course.order within each group ──
function groupByTrack(courses: Course[]): { tag: string; courses: Course[] }[] {
  const map = new Map<string, Course[]>();
  for (const course of courses) {
    const key = course.tag ?? '__other__';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(course);
  }
  return Array.from(map.entries())
    .map(([tag, tagCourses]) => ({
      tag: tag === '__other__' ? 'Other' : tag,
      courses: tagCourses.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => {
      if (a.tag === 'Other') return 1;
      if (b.tag === 'Other') return -1;
      const minA = Math.min(...a.courses.map((c) => c.order));
      const minB = Math.min(...b.courses.map((c) => c.order));
      return minA - minB;
    });
}

export default async function DashboardPage() {
  const { user } = await auth();
  const userId = user?.id;
  const firstName = user?.name?.split(' ')[0] ?? 'Learner';

  const [courses, userData] = await Promise.all([
    getCourses(),
    userId
      ? Promise.all([getDashboardStats(userId), getResumeData(userId)])
      : Promise.resolve(null),
  ]);

  const stats = userData?.[0] ?? { streak: 0, coursesInProgress: 0, coursesTotal: 0, quizAverage: null };
  const resumeData = userData?.[1] ?? null;

  const [courseProgress, startCourse] = await Promise.all([
    userId && courses.length > 0
      ? getUserCoursesProgress(userId, courses.map((c) => c.id))
      : Promise.resolve({} as Record<string, CourseProgress>),
    !resumeData && courses.length > 0
      ? getCourseWithModules(courses[0].slug)
      : Promise.resolve(null),
  ]);

  const startUrl = startCourse?.modules[0]
    ? `/dashboard/course/${startCourse.slug}/${startCourse.modules[0].slug}/lesson/1`
    : null;

  const tracks = groupByTrack(courses);

  return (
    <div className="min-h-screen">
      <HeroSection
        firstName={firstName}
        stats={stats}
        resumeData={resumeData}
        startUrl={startUrl}
      />

      {userId && courses.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 py-8 space-y-10">
          {tracks.map(({ tag, courses: trackCourses }) => (
            <TrackSection
              key={tag}
              tag={tag}
              courses={trackCourses}
              courseProgress={courseProgress}
            />
          ))}
          <RoadmapCTABanner />
        </div>
      )}

      {!userId && <UnauthenticatedCTA />}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroSection({
  firstName,
  stats,
  resumeData,
  startUrl,
}: {
  firstName: string;
  stats: { streak: number; coursesInProgress: number; coursesTotal: number };
  resumeData: Awaited<ReturnType<typeof getResumeData>>;
  startUrl: string | null;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative border-b border-border/50">
      <div className="container mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {stats.streak > 0
            ? `You're on a ${stats.streak}-day streak. Keep building!`
            : resumeData
              ? 'Pick up where you left off.'
              : 'Start your journey to becoming an Agent Architect.'}
        </p>

        {resumeData ? (
          <Link
            href={resumeData.href}
            className="group inline-flex items-center gap-4 rounded-2xl bg-card border border-border/50 p-4 pr-6 transition-all hover:border-primary/30"
          >
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-primary/20">
              {resumeData.course.thumbnail_url ? (
                <Image src={resumeData.course.thumbnail_url} alt={resumeData.course.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Play className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Continue learning</p>
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {resumeData.course.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <Progress value={resumeData.progress} className="flex-1 h-1.5" />
                <span className="text-xs font-medium text-primary">{resumeData.progress}%</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ) : startUrl ? (
          <Link
            href={startUrl}
            className="group inline-flex items-center gap-3 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium transition-all hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Start Your Journey
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function UnauthenticatedCTA() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">Become an Agent Architect</h2>
        <p className="text-muted-foreground mb-6">
          Sign in to track your progress, earn certificates, and unlock the full learning experience.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium transition-all hover:bg-primary/90"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: Delete the old CourseGrid**

```bash
rm app/src/components/dashboard/course-grid.tsx
```

**Step 3: Type check**

```bash
npx tsc --noEmit
```
Expected: no errors. If `getUniqueTags` from `lib/utils` is now unused, that's fine — leave it.

**Step 4: Visual check**

```bash
npm run dev
```
Navigate to `http://localhost:3000/dashboard`. You should see:
- Hero section with greeting
- Track sections with horizontal-scrolling course cards
- Roadmap CTA banner at the bottom

**Step 5: Commit**

```bash
git add app/src/app/dashboard/page.tsx
git add -u app/src/components/dashboard/course-grid.tsx   # stages the deletion
git commit -m "feat: rewrite dashboard with track-row layout"
```

---

## Task 9: API route — /api/roadmap/vote

**Files:**
- Create: `app/src/app/api/roadmap/vote/route.ts`

**Step 1: Create the file**

```typescript
import { auth } from '@/lib/auth/server';
import { toggleRoadmapVote } from '@/lib/data';

export async function POST(request: Request) {
  const { user } = await auth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const itemId = body?.itemId;
  if (!itemId || typeof itemId !== 'string') {
    return Response.json({ error: 'itemId required' }, { status: 400 });
  }

  try {
    const result = await toggleRoadmapVote(user.id, itemId);
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Failed to toggle vote' }, { status: 500 });
  }
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/app/api/roadmap/vote/route.ts
git commit -m "feat: add /api/roadmap/vote toggle endpoint"
```

---

## Task 10: API route — /api/roadmap/submit

**Files:**
- Create: `app/src/app/api/roadmap/submit/route.ts`

**Step 1: Create the file**

```typescript
import { auth } from '@/lib/auth/server';
import { submitRoadmapIdea } from '@/lib/data';

export async function POST(request: Request) {
  const { user } = await auth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = body?.title?.trim();
  const description = body?.description?.trim() ?? '';

  if (!title) {
    return Response.json({ error: 'Title required' }, { status: 400 });
  }
  if (title.length > 80) {
    return Response.json({ error: 'Title too long (max 80 chars)' }, { status: 400 });
  }
  if (description.length > 300) {
    return Response.json({ error: 'Description too long (max 300 chars)' }, { status: 400 });
  }

  try {
    await submitRoadmapIdea(user.id, title, description);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to submit idea' }, { status: 500 });
  }
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/app/api/roadmap/submit/route.ts
git commit -m "feat: add /api/roadmap/submit endpoint"
```

---

## Task 11: IdeaCard component

**Files:**
- Create: `app/src/components/shared/idea-card.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/data';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  idea:        { label: 'Idea',        color: 'bg-muted text-muted-foreground' },
  planned:     { label: 'Planned',     color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  done:        { label: 'Done',        color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
};

interface IdeaCardProps {
  item: RoadmapItem;
  isAuthenticated: boolean;
}

export function IdeaCard({ item, isAuthenticated }: IdeaCardProps) {
  const router = useRouter();
  const [voted, setVoted] = useState(item.user_voted);
  const [count, setCount] = useState(item.vote_count);
  const [loading, setLoading] = useState(false);

  const status = STATUS_MAP[item.status] ?? STATUS_MAP.idea;

  async function handleVote() {
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
      return;
    }
    if (loading) return;
    setLoading(true);
    // Optimistic update
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount((c) => (wasVoted ? c - 1 : c + 1));
    try {
      const res = await fetch('/api/roadmap/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setVoted(data.voted);
        setCount(data.count);
      } else {
        // Revert on error
        setVoted(wasVoted);
        setCount((c) => (wasVoted ? c + 1 : c - 1));
      }
    } catch {
      setVoted(wasVoted);
      setCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border/80 transition-colors">
      {/* Upvote column */}
      <button
        onClick={handleVote}
        disabled={loading}
        className={cn(
          'flex flex-col items-center justify-center gap-1 min-w-[3rem] rounded-lg border px-2 py-2 transition-all disabled:opacity-70',
          voted
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary',
        )}
        aria-label={voted ? 'Remove vote' : 'Upvote'}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-mono font-semibold tabular-nums leading-none">{count}</span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', status.color)}>
            {status.label}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {item.created_by === 'admin' ? 'by zuzu team' : 'suggested by community'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/shared/idea-card.tsx
git commit -m "feat: add IdeaCard component with optimistic upvote"
```

---

## Task 12: SubmitIdeaModal component

**Files:**
- Create: `app/src/components/shared/submit-idea-modal.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SubmitIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitIdeaModal({ open, onOpenChange }: SubmitIdeaModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleClose(value: boolean) {
    if (!value) {
      setTitle('');
      setDescription('');
      setSubmitted(false);
    }
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/roadmap/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => handleClose(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Submit an idea</DialogTitle>
        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Thanks!</p>
            <p className="text-xs text-muted-foreground">We'll review your idea soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Advanced decorators module"
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{title.length}/80</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Description <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Any extra context..."
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{description.length}/300</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!title.trim() || submitting}>
                {submitting ? 'Submitting…' : 'Submit idea'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/shared/submit-idea-modal.tsx
git commit -m "feat: add SubmitIdeaModal component"
```

---

## Task 13: RoadmapPage client component

**Files:**
- Create: `app/src/components/shared/roadmap-page.tsx`

**Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IdeaCard } from './idea-card';
import { SubmitIdeaModal } from './submit-idea-modal';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/data';

const STATUS_TABS = [
  { value: null,          label: 'All'         },
  { value: 'idea',        label: 'Ideas'        },
  { value: 'planned',     label: 'Planned'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'done',        label: 'Done'         },
] as const;

interface RoadmapPageProps {
  items: RoadmapItem[];
  isAuthenticated: boolean;
}

export function RoadmapPage({ items, isAuthenticated }: RoadmapPageProps) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const filtered = activeStatus
    ? items.filter((i) => i.status === activeStatus)
    : items;

  function handleSubmitClick() {
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
      return;
    }
    setSubmitOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Idea Log</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vote on what we build next. Your voice shapes the roadmap.
            </p>
          </div>
          <Button size="sm" onClick={handleSubmitClick} className="shrink-0 ml-4">
            Submit an idea
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-0 mb-6 border-b border-border/50 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setActiveStatus(value)}
              className={cn(
                'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                activeStatus === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No items in this category yet.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <IdeaCard key={item.id} item={item} isAuthenticated={isAuthenticated} />
            ))
          )}
        </div>
      </div>

      <SubmitIdeaModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/src/components/shared/roadmap-page.tsx
git commit -m "feat: add RoadmapPage client component with filter tabs"
```

---

## Task 14: /roadmap route + deploy

**Files:**
- Create: `app/src/app/roadmap/page.tsx`

**Step 1: Create the page**

```tsx
import { auth } from '@/lib/auth/server';
import { getRoadmapItems } from '@/lib/data';
import { RoadmapPage } from '@/components/shared/roadmap-page';

export default async function RoadmapRoute() {
  const { user } = await auth();
  const items = await getRoadmapItems(user?.id ?? null);
  return <RoadmapPage items={items} isAuthenticated={!!user} />;
}
```

**Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Full build check**

```bash
npm run build
```
Expected: build succeeds, no type errors.

**Step 4: Visual check**

```bash
npm run dev
```

Verify:
- `http://localhost:3000/dashboard` → track rows + horizontal scroll + roadmap CTA banner
- `http://localhost:3000/roadmap` → idea log with filter tabs, seeded "Planned" item visible
- Click upvote on an item (authenticated) → count updates optimistically, DB row created
- Click "Submit an idea" → modal opens, submit → "Thanks!" message
- Click roadmap CTA banner on dashboard → navigates to `/roadmap`

**Step 5: Commit**

```bash
git add app/src/app/roadmap/page.tsx
git commit -m "feat: add /roadmap route"
```

**Step 6: Deploy**

```bash
vercel --prod
```

---

## Summary of all new/modified files

| Action | File |
|--------|------|
| Create | `app/migrations/2026-02-28-dashboard-published-at.sql` |
| Create | `app/migrations/2026-02-28-roadmap-tables.sql` |
| Modify | `app/src/lib/data.ts` (Course type, 3 queries, 3 new functions, RoadmapItem type) |
| Create | `app/src/components/dashboard/course-card.tsx` |
| Create | `app/src/components/dashboard/track-section.tsx` |
| Create | `app/src/components/dashboard/roadmap-cta-banner.tsx` |
| Replace | `app/src/app/dashboard/page.tsx` |
| Delete  | `app/src/components/dashboard/course-grid.tsx` |
| Create | `app/src/app/api/roadmap/vote/route.ts` |
| Create | `app/src/app/api/roadmap/submit/route.ts` |
| Create | `app/src/components/shared/idea-card.tsx` |
| Create | `app/src/components/shared/submit-idea-modal.tsx` |
| Create | `app/src/components/shared/roadmap-page.tsx` |
| Create | `app/src/app/roadmap/page.tsx` |
