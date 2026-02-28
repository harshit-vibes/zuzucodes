# Dashboard Tracks + Roadmap Design

**Goal:** Redesign the dashboard with a track-row layout (Approach A) that scales gracefully as courses and tracks are added weekly, and add a `/roadmap` page with an upvote-driven idea log.

**Architecture:** Tracks are derived from `courses.tag` — no new track table needed. The dashboard groups courses by tag into horizontal rows. The roadmap is a separate page (`/roadmap`) with two new DB tables. "New" badges are powered by a `published_at` column added to `courses`.

**Tech Stack:** Next.js App Router, Neon PostgreSQL (raw SQL), Tailwind CSS v4, existing shadcn/ui primitives, existing auth (`authClient` / `auth()`).

---

## 1. Dashboard Layout

### Information Architecture

```
/dashboard
├── Hero bar  (greeting + streak + resume pill)
├── Track section × N  (one per unique tag, ordered by courses.order)
│   ├── Track header  (tag name + "X of Y courses complete" pill)
│   └── Course card row  (horizontal scroll, snap-x on mobile)
└── Roadmap CTA banner  ("💡 Help shape what we build next →")
```

### Hero Bar

Compact single row:
- Left: `"Good morning, {firstName}"` + streak (if > 0): `"🔥 5-day streak"`
- Right: resume pill `"Continue: {lessonTitle} →"` → exact resume URL
- If nothing started: `"Start your first course →"` → first lesson of first course in first track

### Track Section

One section per unique `tag` value, sorted by the minimum `courses.order` within that tag. Courses with `tag = null` render in an "Other" section at the bottom.

```
Python Fundamentals          ●●○○  2 of 4 courses complete
────────────────────────────────────────────────────────────
[card] [card] [card] [card]   ← flex overflow-x-auto, snap-x
```

Track-level progress is derived from the existing `courseProgress` map (already fetched in `dashboard/layout.tsx`) — no extra query.

### Course Card

Fixed width `w-64`, aspect-ratio thumbnail at top:

```
┌────────────────────────────┐
│  [thumbnail / gradient]    │  ← 16:9 image or tag-color gradient fallback
│  NEW  ·  Python            │  ← "New" badge if published_at > NOW()-14d
│  Intro to Python           │  ← title (2-line clamp)
│  ████████░░░░  72%         │  ← progress bar (hidden if progress = 0)
│  Continue  →               │  ← "Start" / "Continue" / "Review"
└────────────────────────────┘
```

Card links to `/dashboard/course/[courseSlug]` (existing course detail page — unchanged).

### Roadmap CTA Banner

Single-row banner at bottom of page (subtle, not loud):

> *"💡 We're building this in public. Vote on what comes next →"*

Links to `/roadmap`.

---

## 2. /roadmap Page

### Layout

```
/roadmap
├── Page header  ("Idea Log" title + "Submit an idea" button)
├── Status filter tabs  (All | Planned | In Progress | Done)
├── Items list  (published items, sorted by vote count desc)
│   └── Idea card × N
└── Submit idea modal  (authenticated users only)
```

### Idea Card

```
┌──────────────────────────────────────────────────────────┐
│  ┌──────┐  Advanced Python: Decorators & Metaclasses     │
│  │  ▲   │  A deep-dive module on Python's advanced        │
│  │  42  │  metaprogramming features.                      │
│  └──────┘                                                 │
│           ● Planned        · suggested by community       │
└──────────────────────────────────────────────────────────┘
```

- **Upvote**: left column. Filled `▲` if current user has voted. Click toggles. Unauthenticated → redirect to sign-in.
- **Status badge**: `Idea` (grey) | `Planned` (blue) | `In Progress` (amber) | `Done` (green)
- **Author**: "by zuzu team" for `created_by = 'admin'`, "suggested by community" for user submissions

### Submit Idea Modal

Form fields:
- **Title** — required, max 80 chars
- **Description** — optional, max 300 chars

On submit: creates row with `is_published = false`. User sees: *"Thanks! We'll review your idea soon."*

Admin approval: flip `is_published = true` directly in DB (no admin UI for now).

---

## 3. Schema Changes

### Migration 1: `published_at` on courses

```sql
ALTER TABLE courses
  ADD COLUMN published_at TIMESTAMPTZ DEFAULT now();
```

Backdate existing courses to avoid false "New" badges:

```sql
UPDATE courses SET published_at = created_at WHERE published_at IS NULL;
-- or a fixed date before the launch of the feature:
UPDATE courses SET published_at = '2026-01-01' WHERE published_at IS NULL;
```

"New" definition: `published_at > NOW() - INTERVAL '14 days'`

### Migration 2: Roadmap tables

```sql
CREATE TABLE roadmap_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL CHECK (char_length(title) <= 80),
  description   TEXT CHECK (char_length(description) <= 300),
  status        TEXT NOT NULL DEFAULT 'idea'
                  CHECK (status IN ('idea', 'planned', 'in_progress', 'done')),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_by    TEXT NOT NULL,  -- 'admin' or user_id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roadmap_votes (
  user_id   TEXT NOT NULL,
  item_id   UUID NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX roadmap_votes_item_id ON roadmap_votes(item_id);
```

Vote count: `SELECT COUNT(*) FROM roadmap_votes WHERE item_id = $1` — no denormalised counter at this scale.

---

## 4. Data Layer (`lib/data.ts`)

### Course type update

Add `published_at` to the `Course` interface and all `SELECT` queries that return courses.

### New functions

```typescript
// Returns published roadmap items with vote counts + whether current user voted
getRoadmapItems(userId: string | null, status?: string): Promise<RoadmapItem[]>

// Toggle vote — inserts or deletes from roadmap_votes
toggleRoadmapVote(userId: string, itemId: string): Promise<{ voted: boolean; count: number }>

// Submit new idea (is_published = false)
submitRoadmapIdea(userId: string, title: string, description: string): Promise<void>
```

---

## 5. New Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/roadmap` | Page (server) | Roadmap page — fetches items + user votes |
| `/api/roadmap/vote` | POST/DELETE | Toggle vote on an item |
| `/api/roadmap/submit` | POST | Submit new idea |

---

## 6. Components

| Component | File | Notes |
|-----------|------|-------|
| `TrackSection` | `components/dashboard/track-section.tsx` | Track header + horizontal card row |
| `CourseCard` | `components/dashboard/course-card.tsx` | Replaces inline card in `CourseGrid` |
| `RoadmapCTABanner` | `components/dashboard/roadmap-cta-banner.tsx` | Bottom-of-dashboard CTA |
| `RoadmapPage` | `components/shared/roadmap-page.tsx` | Full roadmap client component |
| `IdeaCard` | `components/shared/idea-card.tsx` | Single roadmap item with upvote |
| `SubmitIdeaModal` | `components/shared/submit-idea-modal.tsx` | Submit idea form |

Existing `CourseGrid` component is **replaced** by `TrackSection` rows in `dashboard/page.tsx`. `CourseGrid` file can be deleted.

---

## 7. Edge Cases

| Case | Handling |
|------|---------|
| `tag = null` | Course appears in "Other" section at bottom |
| Track with 1 course | Card renders left-aligned, no scroll needed |
| Track with 10+ courses | Overflow hint: last card partially visible to signal scroll |
| 0 progress user | Hero shows "Start your first course →" |
| Unauthenticated on `/roadmap` | Can read, upvote/submit redirects to sign-in |
| Duplicate vote attempt | DB PRIMARY KEY constraint prevents it; API returns current state |

---

## 8. Out of Scope

- Admin UI for approving roadmap submissions (flip `is_published` in DB)
- Roadmap item comments
- Email notifications for vote milestones
- Dedicated track pages (`/dashboard/track/[tag]`)
- Search / filter on dashboard (not needed at current scale)
