# Dashboard + Sidebar Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the stats grid from the sidebar, add a clean utility-pages separator, and add a server-computed "Today's Focus" card to the dashboard that tells the learner exactly what to do next.

**Architecture:** Three self-contained changes: (1) sidebar cleanup — remove stats component and prop, add separator; (2) data layer — add `NextAction` type + `getNextAction()` async function to `data.ts`; (3) dashboard page — simplify hero, add `TodaysFocusCard` component, wire up `getNextAction`. No new DB schema or migrations.

**Tech Stack:** Next.js App Router (server components), TypeScript, Tailwind CSS, `@/lib/data.ts` (raw SQL via `@neondatabase/serverless`), lucide-react icons.

---

### Task 1: Sidebar — remove stats, add utility separator

**Files:**
- Modify: `src/components/shared/app-sidebar.tsx`
- Modify: `src/app/dashboard/layout.tsx`

**Context:**
`AppSidebar` has a `stats?: DashboardStats` prop used to render a 2×2 stat grid (`SidebarStats` component) in dashboard mode. The layout (`dashboard/layout.tsx`) fetches `getDashboardStats` and passes it in. We remove all of this.

The current dashboard-mode sidebar renders Dashboard + Roadmap as siblings in one `SidebarGroup`. After this task they'll be in separate groups with a `border-t` separator between them — formalising the "utility pages" pattern.

**Step 1: Edit `src/components/shared/app-sidebar.tsx`**

Remove the 4 stat-only lucide imports (`Flame`, `GraduationCap`, `Target`, `Timer`) from line 4:

```diff
 import {
   Award,
   BookOpen,
   CircleDot,
   Diamond,
-  Flame,
-  GraduationCap,
   Home,
   Map,
   Sparkles,
-  Target,
-  Timer,
+  GraduationCap,
 } from "lucide-react";
```

(Note: `GraduationCap` is used in the course-mode nav — keep it. Only `Flame`, `Target`, `Timer` are stat-only.)

Corrected removal — only remove `Flame`, `Target`, `Timer`:
```diff
 import {
   Award,
   BookOpen,
   CircleDot,
   Diamond,
-  Flame,
   GraduationCap,
   Home,
   Map,
   Sparkles,
-  Target,
-  Timer,
 } from "lucide-react";
```

Remove `Progress` import only if it's not used elsewhere in the file. **Check first:** `Progress` is used in course mode (`<Progress value={activeProgress.progress} ... />`). **Keep it.**

Remove `DashboardStats` from the type import on line 36:
```diff
-import type { CourseWithModules, SidebarCourseProgress, DashboardStats, SectionStatus, SubscriptionRow } from "@/lib/data";
+import type { CourseWithModules, SidebarCourseProgress, SectionStatus, SubscriptionRow } from "@/lib/data";
```

Remove `stats` from `AppSidebarProps` (around line 43):
```diff
 interface AppSidebarProps {
   courses: CourseWithModules[];
   courseProgress?: Record<string, SidebarCourseProgress>;
   contentCompletion?: Record<string, SectionStatus>;
-  stats?: DashboardStats;
   user: { name: string | null; email: string | null; image: string | null };
   subscription: SubscriptionRow | null;
 }
```

Remove `stats` from the `AppSidebar` function destructuring (around line 218):
```diff
 export function AppSidebar({
   courses,
   courseProgress,
   contentCompletion = {},
-  stats,
   user,
   subscription,
 }: AppSidebarProps) {
```

Delete the entire `SidebarStats` function (lines ~193–212):
```diff
-// ============================================
-// Sidebar stats (compact 2x2 grid)
-// ============================================
-
-function SidebarStats({ stats }: { stats: DashboardStats }) {
-  const items = [
-    ...
-  ];
-  return (
-    <div className="grid grid-cols-2 gap-2 px-3">
-      ...
-    </div>
-  );
-}
```

In the dashboard mode render block, replace the current single `SidebarGroup` containing both Dashboard and Roadmap (and the stats group below) with two separate groups and a separator:

**Before** (around lines 264–307):
```tsx
<>
  <SidebarGroup className="pb-1">
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Dashboard */}
        </SidebarMenuItem>
        <SidebarMenuItem>
          {/* Roadmap */}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  {/* Stats */}
  {stats && (
    <SidebarGroup className="py-2">
      <SidebarGroupContent>
        <SidebarStats stats={stats} />
      </SidebarGroupContent>
    </SidebarGroup>
  )}
</>
```

**After:**
```tsx
<>
  {/* Primary nav */}
  <SidebarGroup className="pb-1">
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive
            tooltip="Dashboard"
            className="rounded-lg bg-primary/10 text-primary font-medium"
          >
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  {/* Separator */}
  <div className="mx-3 my-1 border-t border-border/40" />

  {/* Utility pages */}
  <SidebarGroup className="pt-1 pb-1">
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Roadmap"
            className="rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/roadmap" className="flex items-center gap-3 px-3 py-2">
              <Map className="h-4 w-4" />
              <span>Roadmap</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</>
```

**Step 2: Edit `src/app/dashboard/layout.tsx`**

Remove `getDashboardStats` from the import:
```diff
-import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getDashboardStats, getSubscriptionStatus, type SectionStatus } from "@/lib/data";
+import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getSubscriptionStatus, type SectionStatus } from "@/lib/data";
```

Remove `getDashboardStats` from the `Promise.all` and destructuring:
```diff
-  const [courseProgress, contentCompletion, stats] = await Promise.all([
+  const [courseProgress, contentCompletion] = await Promise.all([
     getSidebarProgress(user.id, courseIds),
     allModules.length > 0
       ? getSectionCompletionStatus(user.id, allModules)
       : Promise.resolve({} as Record<string, SectionStatus>),
-    getDashboardStats(user.id),
   ]);
```

Remove `stats={stats}` from `<AppSidebar>`:
```diff
   <AppSidebar
     courses={courses}
     courseProgress={courseProgress}
     contentCompletion={contentCompletion}
-    stats={stats}
     user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
     subscription={subscription}
   />
```

**Step 3: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. Confirm:
- Sidebar shows Dashboard item, then a thin separator line, then Roadmap item
- No stats grid anywhere in the sidebar
- Sidebar footer (UserCard) still present

**Step 5: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/components/shared/app-sidebar.tsx app/src/app/dashboard/layout.tsx
git commit -m "feat: remove stats grid from sidebar, add utility pages separator"
```

---

### Task 2: Data layer — `NextAction` type + `getNextAction()` function

**Files:**
- Modify: `src/lib/data.ts`

**Context:**
`data.ts` already has:
- `getCourseWithModules(slug)` → `CourseWithModules | null` (line ~125). `CourseWithModules` extends `Course` and has `.modules[]` where each module has `id`, `slug`, `title`, `order`, and `contentItems: Array<{ type: 'lesson' | 'quiz'; index: number; title: string }>`.
- `getSectionCompletionStatus(userId, modules[])` → `Record<string, SectionStatus>` (line ~738). Keys: `"{moduleId}:lesson-{index}"` and `"{moduleId}:quiz"`. Values: `'not-started' | 'in-progress' | 'completed'`.
- `CourseProgress` type with `status: 'not_started' | 'in_progress' | 'completed'` and `progress: number`.
- `Course` type with `id, title, slug, tag, order, published_at, thumbnail_url`.

`getNextAction` calls these internally — at most 2 extra queries, scoped to the single active course.

**Step 1: Add `NextAction` type and `getNextAction` function to `src/lib/data.ts`**

Append at the end of the file (after the last export):

```typescript
// ============================================================
// Next action — computed "what to do next" for the dashboard
// ============================================================

export type NextAction =
  | { type: 'start';       course: Course; href: string }
  | { type: 'lesson';      course: Course; moduleTitle: string; lessonTitle: string; href: string }
  | { type: 'quiz';        course: Course; moduleTitle: string; href: string }
  | { type: 'next_course'; course: Course; href: string }
  | { type: 'all_done' }
  | null;

export async function getNextAction(
  userId: string,
  courses: Course[],
  courseProgress: Record<string, CourseProgress>,
): Promise<NextAction> {
  if (courses.length === 0) return null;

  const sorted = [...courses].sort((a, b) => a.order - b.order);

  // Find first in_progress course, or first not_started if none
  const activeCourse = sorted.find(
    (c) => (courseProgress[c.id]?.status ?? 'not_started') === 'in_progress',
  );

  if (!activeCourse) {
    const nextCourse = sorted.find(
      (c) => (courseProgress[c.id]?.status ?? 'not_started') === 'not_started',
    );
    if (!nextCourse) return { type: 'all_done' };

    const courseData = await getCourseWithModules(nextCourse.slug);
    if (!courseData || courseData.modules.length === 0) return null;
    const firstMod = courseData.modules[0];
    return {
      type: 'start',
      course: nextCourse,
      href: `/dashboard/course/${nextCourse.slug}/${firstMod.slug}/lesson/1`,
    };
  }

  // Fetch active course structure + section completion (2 queries for 1 course)
  const courseData = await getCourseWithModules(activeCourse.slug);
  if (!courseData || courseData.modules.length === 0) return null;

  const completion = await getSectionCompletionStatus(userId, courseData.modules);

  for (const mod of courseData.modules) {
    const lessons = mod.contentItems.filter((i) => i.type === 'lesson');
    const hasQuiz = mod.contentItems.some((i) => i.type === 'quiz');

    const allLessonsDone = lessons.every(
      (item) =>
        (completion[`${mod.id}:lesson-${item.index}`] ?? 'not-started') === 'completed',
    );
    const quizDone =
      !hasQuiz ||
      (completion[`${mod.id}:quiz`] ?? 'not-started') === 'completed';

    if (allLessonsDone && quizDone) continue; // this module is fully complete

    // Find first incomplete lesson in this module
    const nextLesson = lessons.find(
      (item) =>
        (completion[`${mod.id}:lesson-${item.index}`] ?? 'not-started') !== 'completed',
    );

    if (nextLesson) {
      const order = nextLesson.index + 1; // 1-indexed
      return {
        type: 'lesson',
        course: activeCourse,
        moduleTitle: mod.title,
        lessonTitle: nextLesson.title,
        href: `/dashboard/course/${activeCourse.slug}/${mod.slug}/lesson/${order}`,
      };
    }

    // All lessons done but quiz pending
    if (hasQuiz && !quizDone) {
      return {
        type: 'quiz',
        course: activeCourse,
        moduleTitle: mod.title,
        href: `/dashboard/course/${activeCourse.slug}/${mod.slug}/quiz`,
      };
    }
  }

  // Active course fully complete — point to next not_started course
  const nextCourse = sorted.find(
    (c) => (courseProgress[c.id]?.status ?? 'not_started') === 'not_started',
  );
  if (nextCourse) {
    return {
      type: 'next_course',
      course: nextCourse,
      href: `/dashboard/course/${nextCourse.slug}`,
    };
  }

  return { type: 'all_done' };
}
```

**Step 2: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit
```

Expected: 0 errors. If `CourseProgress` isn't in scope inside `getNextAction`, check the type is exported — it should be at the top of `data.ts`.

**Step 3: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/lib/data.ts
git commit -m "feat: add NextAction type and getNextAction() to data.ts"
```

---

### Task 3: Dashboard page — TodaysFocusCard + simplified hero

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Context:**
Currently `page.tsx`:
- Fetches `getDashboardStats` + `getResumeData` + `getCourseWithModules` (for startCourse)
- `HeroSection` shows greeting + streak badge + embedded resume card
- Uses `Image`, `Play`, `Sparkles`, `ArrowRight` icons

After this task:
- `getDashboardStats` stays (streak badge in hero)
- `getResumeData` removed — `getNextAction` supersedes it
- `getCourseWithModules` removed from page (called internally by `getNextAction`)
- `HeroSection` shows greeting + streak badge only (no resume card)
- `TodaysFocusCard` new component between hero and tracks

**Step 1: Replace `src/app/dashboard/page.tsx` entirely**

```tsx
import { auth } from '@/lib/auth/server';
import {
  getDashboardStats,
  getCourses,
  getUserCoursesProgress,
  getNextAction,
} from '@/lib/data';
import type { Course, CourseProgress, NextAction } from '@/lib/data';
import Link from 'next/link';
import { ArrowRight, Diamond, Play, Sparkles, Trophy } from 'lucide-react';
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

  const [courses, stats] = await Promise.all([
    getCourses(),
    userId ? getDashboardStats(userId) : null,
  ]);

  const streak = stats?.streak ?? 0;

  const courseProgress =
    userId && courses.length > 0
      ? await getUserCoursesProgress(userId, courses.map((c) => c.id))
      : ({} as Record<string, CourseProgress>);

  const nextAction = userId ? await getNextAction(userId, courses, courseProgress) : null;

  const tracks = groupByTrack(courses);

  return (
    <div className="min-h-screen">
      <HeroSection firstName={firstName} streak={streak} />

      {userId && courses.length > 0 && (
        <>
          <TodaysFocusCard action={nextAction} />
          <div className="container mx-auto px-4 sm:px-6 py-6 space-y-10">
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
        </>
      )}

      {!userId && <UnauthenticatedCTA />}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroSection({ firstName, streak }: { firstName: string; streak: number }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative border-b border-border/40 overflow-hidden">
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative container mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-1">
              {greeting}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
          </div>
          {streak > 0 && (
            <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-xl">🔥</span>
              <span className="text-xs font-bold font-mono text-amber-500 tabular-nums leading-none mt-0.5">
                {streak}d
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Config lookup for each NextAction type (excludes null and all_done — handled separately)
function getActionConfig(action: Exclude<NextAction, null | { type: 'all_done' }>) {
  switch (action.type) {
    case 'start':
      return {
        Icon: Sparkles,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Start your journey',
        subtext: action.course.title,
        cta: 'Begin',
        href: action.href,
      };
    case 'lesson':
      return {
        Icon: Play,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Pick up where you left off',
        subtext: `${action.moduleTitle} · ${action.lessonTitle}`,
        cta: 'Continue',
        href: action.href,
      };
    case 'quiz':
      return {
        Icon: Diamond,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        headline: 'Time to test yourself',
        subtext: action.moduleTitle,
        cta: 'Take the quiz',
        href: action.href,
      };
    case 'next_course':
      return {
        Icon: Sparkles,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Ready for the next challenge',
        subtext: action.course.title,
        cta: 'Start Course',
        href: action.href,
      };
  }
}

function TodaysFocusCard({ action }: { action: NextAction }) {
  if (!action) return null;

  if (action.type === 'all_done') {
    return (
      <div className="container mx-auto px-6 pt-4 pb-0">
        <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold">You&apos;ve finished everything 🎉</p>
            <p className="text-xs text-muted-foreground mt-0.5">More content coming soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const { Icon, iconColor, iconBg, headline, subtext, cta, href } = getActionConfig(action);

  return (
    <div className="container mx-auto px-6 pt-4 pb-0">
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 hover:border-primary/40 hover:bg-primary/[0.08] transition-all"
      >
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtext}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-medium text-primary shrink-0">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
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
          Sign in to track your progress, earn certificates, and unlock the full learning
          experience.
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

**Step 2: Type-check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit
```

Expected: 0 errors. Common issue: if `NextAction` isn't exported from `data.ts`, add `export` in front of the type declaration in Task 2.

**Step 3: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and verify:

| Scenario | Expected |
|----------|----------|
| User with in-progress lesson | Blue "Pick up where you left off" card with lesson + module info |
| User with all lessons done, quiz pending | Amber "Time to test yourself" card with module name |
| User who just finished a course | "Ready for the next challenge" card pointing to next course |
| User with no progress | "Start your journey" card with first course title |
| All courses complete | "You've finished everything 🎉" (trophy) |
| Hero section | Greeting + streak badge only (no resume card) |

**Step 4: Commit**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes
git add app/src/app/dashboard/page.tsx
git commit -m "feat: add TodaysFocusCard to dashboard, simplify hero"
```

---

### Final: Type-check + deploy

**Step 1: Full type check**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Deploy**

```bash
cd /Users/harshitchoudhary/Documents/projects/zuzucodes/app
vercel --prod
```

Expected: Deployment URL printed. Visit `https://app.zuzu.codes/dashboard` to confirm live.
