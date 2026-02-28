# PostHog Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Instrument zuzu.codes with PostHog analytics to measure conversion (landing → subscription), activation (first lesson pass), and retention (return visits).

**Architecture:** `posthog-js` in both Next.js apps via a `<PostHogProvider>` client component wrapping each root layout; `posthog-node` in two API routes for server-authoritative events; cross-domain identity stitching via `phDistinctId` query param from `zuzu.codes` → `app.zuzu.codes`.

**Tech Stack:** `posthog-js@latest`, `posthog-node@latest`, Next.js App Router, two apps (`app/` and `web/`), Neon Auth, Neon Postgres.

Reference design: `app/docs/plans/2026-02-28-posthog-analytics-design.md`

---

## Task 1: Install packages and add env vars

**Files:**
- Run in: `app/` and `web/`

**Step 1: Install packages**

```bash
cd app && npm install posthog-js posthog-node
cd ../web && npm install posthog-js
```

**Step 2: Add env vars to `app/.env.local`**

```
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXX          # Get from PostHog project settings
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_XXXX                  # Same key — used by Node SDK in API routes
```

**Step 3: Add env vars to `web/.env.local`**

```
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXX
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_APP_URL=https://app.zuzu.codes
```

**Step 4: Verify packages are installed**

```bash
cd app && node -e "require('posthog-js'); require('posthog-node'); console.log('ok')"
cd ../web && node -e "require('posthog-js'); console.log('ok')"
```

Expected: `ok` twice.

**Step 5: Commit**

```bash
git add app/package.json app/package-lock.json web/package.json web/package-lock.json
git commit -m "chore: install posthog-js and posthog-node"
```

---

## Task 2: PostHogProvider for `app/` with pageview tracking and session replay

**Files:**
- Create: `app/src/components/shared/posthog-provider.tsx`
- Modify: `app/src/app/layout.tsx`

**Step 1: Create the PostHogProvider client component**

Create `app/src/components/shared/posthog-provider.tsx`:

```tsx
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    ph?.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phDistinctId = params.get('phDistinctId');

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
      bootstrap: phDistinctId
        ? { distinctID: phDistinctId, isIdentifiedID: false }
        : undefined,
      session_recording: {
        maskTextSelector: '.ph-no-capture',
        blockClass: 'ph-no-capture',
      },
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
```

The `bootstrap` block enables cross-domain identity stitching (Task 5): when a user arrives from the landing page with `?phDistinctId=...`, PostHog continues their anonymous session.

**Step 2: Wrap the root layout body**

Modify `app/src/app/layout.tsx`. Add the import and wrap the body content:

```tsx
import { PostHogProvider } from '@/components/shared/posthog-provider';

// In RootLayout — wrap everything inside <body>:
<body className={`${dmSans.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}>
  <PostHogProvider>
    <NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP social={{ providers: ['google'] }}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </NeonAuthUIProvider>
  </PostHogProvider>
</body>
```

**Step 3: Verify pageview events**

Run `cd app && npm run dev`. Open the app, navigate between pages. In PostHog → Live Events, confirm `$pageview` events arrive with correct `$current_url`.

**Step 4: Commit**

```bash
cd app
git add src/components/shared/posthog-provider.tsx src/app/layout.tsx
git commit -m "feat(analytics): PostHogProvider in app/ with session replay and pageview tracking"
```

---

## Task 3: User identification (PostHogIdentifier)

**Files:**
- Create: `app/src/components/shared/posthog-identifier.tsx`
- Modify: `app/src/app/layout.tsx`

PostHog `identify()` must run on the client. The root layout (Server Component) fetches user data and passes it as props to a thin client component.

**Step 1: Create PostHogIdentifier**

Create `app/src/components/shared/posthog-identifier.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

interface PostHogIdentifierProps {
  userId: string | null;
  email: string | null;
  name: string | null;
  subscriptionStatus: string;
}

export function PostHogIdentifier({
  userId,
  email,
  name,
  subscriptionStatus,
}: PostHogIdentifierProps) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!userId || !posthog) return;

    posthog.identify(userId, {
      email: email ?? undefined,
      name: name ?? undefined,
      subscription_status: subscriptionStatus,
    });

    // Fire sign_in_completed once per browser session (sessionStorage guard)
    const sessionKey = `ph_auth_${userId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    posthog.capture('sign_in_completed', { method: 'otp' });
  }, [userId, email, name, subscriptionStatus, posthog]);

  return null;
}
```

Note: We fire `sign_in_completed` for all sign-ins (both new and returning). If you want to distinguish new sign-ups, check PostHog for first-time `sign_in_completed` events per person — or add a `is_new_user` flag if the Neon Auth user object exposes `createdAt`.

**Step 2: Fetch user data in layout and render identifier**

Modify `app/src/app/layout.tsx` — make the layout `async` and call `auth()`:

```tsx
import { auth } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/lib/data';
import { PostHogIdentifier } from '@/components/shared/posthog-identifier';

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await auth();
  const subscription = user ? await getSubscriptionStatus(user.id) : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}>
        <PostHogProvider>
          <PostHogIdentifier
            userId={user?.id ?? null}
            email={user?.email ?? null}
            name={user?.name ?? null}
            subscriptionStatus={subscription?.status ?? 'free'}
          />
          <NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP social={{ providers: ['google'] }}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
              {children}
            </ThemeProvider>
          </NeonAuthUIProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
```

**Step 3: Verify identification**

Sign into the app. In PostHog → Persons, the user should appear with email, name, and subscription_status. On the next page load, confirm `sign_in_completed` fires only once per session.

**Step 4: Commit**

```bash
git add src/components/shared/posthog-identifier.tsx src/app/layout.tsx
git commit -m "feat(analytics): identify users in PostHog on every authenticated page load"
```

---

## Task 4: PostHogProvider for `web/` (anonymous)

**Files:**
- Create: `web/src/components/posthog-provider.tsx`
- Modify: `web/src/app/layout.tsx`

Same as Task 2 but no user identification — landing page visitors are always anonymous.

**Step 1: Create PostHogProvider**

Create `web/src/components/posthog-provider.tsx`:

```tsx
'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    ph?.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
```

**Step 2: Wrap web/ root layout**

Modify `web/src/app/layout.tsx`:

```tsx
import { PostHogProvider } from '@/components/posthog-provider';

// In RootLayout body — wrap ThemeProvider:
<body className={`${dmSans.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}>
  <PostHogProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  </PostHogProvider>
</body>
```

**Step 3: Verify pageview events**

Run `cd web && npm run dev`. Check PostHog Live Events for `$pageview` from `zuzu.codes`.

**Step 4: Commit**

```bash
cd web
git add src/components/posthog-provider.tsx src/app/layout.tsx
git commit -m "feat(analytics): PostHogProvider in web/ landing page (anonymous)"
```

---

## Task 5: Cross-domain identity stitching + landing page CTA events

When a user clicks a CTA on the landing page, append their PostHog anonymous ID to the sign-up URL so the app links the anonymous session to the identified user profile.

**Files:**
- Create: `web/src/lib/get-sign-up-url.ts`
- Modify: `web/src/components/landing/hero-section.tsx`
- Modify: `web/src/components/landing/pricing-section.tsx` (find CTA buttons)
- Modify: `web/src/components/landing/footer-cta-section.tsx` (find CTA buttons)
- Modify: any header component with a sign-up CTA

**Step 1: Create getSignUpUrl utility**

Create `web/src/lib/get-sign-up-url.ts`:

```ts
import posthog from 'posthog-js';

const APP_SIGN_IN = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-in`
  : 'https://app.zuzu.codes/auth/sign-in';

export function getSignUpUrl(): string {
  try {
    const distinctId = posthog.get_distinct_id();
    if (distinctId) {
      return `${APP_SIGN_IN}?phDistinctId=${encodeURIComponent(distinctId)}`;
    }
  } catch {
    // posthog not yet initialized
  }
  return APP_SIGN_IN;
}
```

**Step 2: Update all CTA buttons to use getSignUpUrl and fire cta_clicked**

Every "Get Started" / "Start Free Trial" / "Sign Up Now" button/link must:
1. Compute the URL dynamically via `getSignUpUrl()` (so the button can't be a static `<Link>` with an `href` — it needs `'use client'` and a click handler or a computed value)
2. Fire `cta_clicked` with the section name and button text

Pattern to apply in each CTA component (make them `'use client'` if not already):

```tsx
'use client';

import { usePostHog } from 'posthog-js/react';
import { getSignUpUrl } from '@/lib/get-sign-up-url';

// Inside the component:
const ph = usePostHog();

function handleCta(section: string, text: string) {
  ph?.capture('cta_clicked', { section, text });
}

// Replace static href with getSignUpUrl() and add onClick:
<a
  href={getSignUpUrl()}
  onClick={() => handleCta('hero', 'Get Started Free')}
  className="..."
>
  Get Started Free
</a>
```

Section names to use per component:
- `hero-section.tsx` → `'hero'`
- `pricing-section.tsx` → `'pricing'`
- `footer-cta-section.tsx` → `'footer_cta'`
- Header CTA (if present) → `'header'`

Read each file first to find the exact button/anchor elements before modifying.

**Step 3: Verify stitching end-to-end**

1. Open `zuzu.codes` in an incognito window. Note the anonymous ID in PostHog Live Events.
2. Click a CTA. Verify the URL contains `?phDistinctId=<anon_id>`.
3. Complete sign-in in the app (Task 2's `bootstrap` option picks up the anon ID).
4. In PostHog → Persons, the profile should show events from both the anonymous and identified sessions merged.

**Step 4: Commit**

```bash
cd web
git add src/lib/get-sign-up-url.ts src/components/landing/
git commit -m "feat(analytics): cross-domain identity stitching and cta_clicked events"
```

---

## Task 6: Remaining landing page events (pricing_viewed, faq_expanded)

**Files:**
- Modify: `web/src/components/landing/pricing-section.tsx`
- Modify: `web/src/components/landing/faq-section.tsx`

**Step 1: pricing_viewed with Intersection Observer**

In `pricing-section.tsx`, add a `useRef` + `IntersectionObserver` that fires once when the section scrolls into view. This component must be `'use client'` (it already is if you added CTA tracking in Task 5, otherwise add it now).

```tsx
import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-js/react';

// Inside PricingSection:
const sectionRef = useRef<HTMLElement>(null);
const ph = usePostHog();
const firedRef = useRef(false);

useEffect(() => {
  const el = sectionRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !firedRef.current) {
        firedRef.current = true;
        ph?.capture('pricing_viewed');
      }
    },
    { threshold: 0.3 }
  );
  observer.observe(el);
  return () => observer.disconnect();
}, [ph]);

// Add ref to the section root element:
// <section ref={sectionRef} ...>
```

**Step 2: faq_expanded when accordion opens**

In `faq-section.tsx`, `FaqItem` has a local `open` state. Convert the `onClick` to a named handler and fire when opening:

```tsx
import { usePostHog } from 'posthog-js/react';

function FaqItem({ question, answer, id }: { question: string; answer: string; id: string }) {
  const [open, setOpen] = useState(false);
  const ph = usePostHog();
  const panelId = `faq-panel-${id}`;

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      ph?.capture('faq_expanded', { question });
    }
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        {/* existing content */}
      </button>
      {/* existing panel */}
    </div>
  );
}
```

**Step 3: Verify events**

Scroll to the pricing section — `pricing_viewed` should fire once. Open and close an FAQ item — `faq_expanded` should fire on each open.

**Step 4: Commit**

```bash
cd web
git add src/components/landing/pricing-section.tsx src/components/landing/faq-section.tsx
git commit -m "feat(analytics): pricing_viewed and faq_expanded landing page events"
```

---

## Task 7: Course player events (lesson_started, code_run, lesson_completed)

**Files:**
- Modify: `app/src/components/lesson/code-lesson-layout.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`
- Modify: `app/src/components/lesson/code-editor.tsx` (add .ph-no-capture)

**Step 1: Extend CodeLessonLayoutProps**

In `code-lesson-layout.tsx`, add three new props to the interface and remove the underscore prefix from existing unused props:

```ts
interface CodeLessonLayoutProps {
  lessonTitle: string;       // was _lessonTitle — remove underscore
  courseId: string;          // was _courseId — remove underscore
  moduleId: string;          // was _moduleId — remove underscore
  courseSlug: string;        // NEW
  moduleSlug: string;        // NEW
  lessonIndex: number;       // NEW — 0-based index
  // ... all other existing props unchanged ...
}

export function CodeLessonLayout({
  lessonTitle,    // remove underscore prefix from destructuring
  courseId,       // remove underscore prefix from destructuring
  moduleId,       // remove underscore prefix from destructuring
  courseSlug,
  moduleSlug,
  lessonIndex,
  // ... rest unchanged ...
}: CodeLessonLayoutProps) {
```

**Step 2: Add lesson_started on mount**

```tsx
import { usePostHog } from 'posthog-js/react';

// Inside CodeLessonLayout, after existing state declarations:
const posthog = usePostHog();
const runAttemptsRef = useRef(0);
const lessonCompletedFiredRef = useRef(false);

// Fire lesson_started once on mount:
useEffect(() => {
  posthog?.capture('lesson_started', {
    course_slug: courseSlug,
    module_slug: moduleSlug,
    lesson_index: lessonIndex,
    lesson_title: lessonTitle,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Step 3: Add code_run tracking in handleRun**

At the top of `handleRun`, increment the attempts counter:

```ts
const handleRun = async () => {
  if (isExecutingRef.current) return;
  isExecutingRef.current = true;
  runAttemptsRef.current += 1;   // ADD THIS
  // ... existing code ...
```

After `setExecutionPhase('tle')` return statement, capture:

```ts
if (statusId === 5) {
  setExecutionPhase('tle');
  posthog?.capture('code_run', { course_slug: courseSlug, module_slug: moduleSlug, lesson_index: lessonIndex, phase: 'tle' });
  return;
}
```

After `setExecutionPhase('error')` calls, capture:

```ts
if (stderr || ...) {
  setParsedError(parsePythonError(errorText.trim()));
  setExecutionPhase('error');
  posthog?.capture('code_run', { course_slug: courseSlug, module_slug: moduleSlug, lesson_index: lessonIndex, phase: 'error' });
  return;
}
```

After `setExecutionPhase(testResult.allPassed ? 'run-pass' : 'run-fail')`, capture:

```ts
setExecutionPhase(testResult.allPassed ? 'run-pass' : 'run-fail');
posthog?.capture('code_run', {
  course_slug: courseSlug,
  module_slug: moduleSlug,
  lesson_index: lessonIndex,
  phase: testResult.allPassed ? 'run-pass' : 'run-fail',
});
```

**Step 4: Add lesson_completed in the allPassed block**

In the `if (testResult.allPassed)` block, before the confetti:

```ts
if (testResult.allPassed) {
  if (!lessonCompletedFiredRef.current) {
    lessonCompletedFiredRef.current = true;
    posthog?.capture('lesson_completed', {
      course_slug: courseSlug,
      module_slug: moduleSlug,
      lesson_index: lessonIndex,
      attempts: runAttemptsRef.current,
    });
  }
  router.refresh();
  // ... confetti code ...
}
```

**Step 5: Pass new props from the lesson page**

In `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`, find the `<CodeLessonLayout>` render and add the new props (all are available from the page params and data):

```tsx
<CodeLessonLayout
  // existing props:
  lessonTitle={lessonData.title}
  courseId={course.id}
  moduleId={module.id}
  lessonId={lessonData.id}
  // ... other existing props ...
  // NEW:
  courseSlug={courseSlug}
  moduleSlug={moduleSlug}
  lessonIndex={position - 1}
/>
```

**Step 6: Mask the code editor**

In `app/src/components/lesson/code-editor.tsx`, find the root wrapper `<div>` and add the class:

```tsx
<div className="... ph-no-capture">
  {/* CodeMirror */}
</div>
```

This prevents session recordings from capturing user code.

**Step 7: Verify events**

Navigate to a lesson. Check PostHog Live Events:
- `lesson_started` fires once on load
- `code_run` fires with correct `phase` each time Run is clicked
- `lesson_completed` fires (once) when all tests pass

**Step 8: Commit**

```bash
cd app
git add src/components/lesson/code-lesson-layout.tsx
git add src/components/lesson/code-editor.tsx
git add "src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx"
git commit -m "feat(analytics): lesson_started, code_run, lesson_completed events in course player"
```

---

## Task 8: Quiz client events (quiz_started, quiz_reset)

Note: `quiz_submitted` fires server-side in Task 11. This task handles the two client-only events.

**Files:**
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`

**Step 1: Add courseSlug and moduleSlug to QuizPlayerProps**

In `quiz-player.tsx`:

```ts
interface QuizPlayerProps {
  moduleId: string;
  questions: Question[];
  passingScore: number;
  courseId: string;
  courseSlug: string;   // NEW
  moduleSlug: string;   // NEW
  isAlreadyPassed?: boolean;
}
```

**Step 2: Add quiz_started on mount**

```tsx
import { usePostHog } from 'posthog-js/react';

// Inside QuizPlayer:
const posthog = usePostHog();

// quiz_started — after the localStorage restore useEffect:
useEffect(() => {
  if (!showPreviouslyPassed) {
    posthog?.capture('quiz_started', {
      course_slug: courseSlug,
      module_slug: moduleSlug,
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Step 3: Add quiz_reset in handleRetake**

In `handleRetake`, in the `finally` block, fire the event before resetting UI state:

```ts
const handleRetake = async () => {
  setIsResetting(true);
  try {
    await fetch('/api/quiz/submit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId }),
    });
  } catch (error) {
    console.error('Error resetting quiz:', error);
  } finally {
    posthog?.capture('quiz_reset', {   // ADD
      course_slug: courseSlug,
      module_slug: moduleSlug,
    });
    setIsResetting(false);
    setShowPreviouslyPassed(false);
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    localStorage.removeItem(storageKey);
  }
};
```

**Step 4: Pass new props from quiz page**

In `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`, the `courseSlug` and `moduleSlug` are available as route params. Pass them to `QuizPlayer`:

```tsx
<QuizPlayer
  // existing props ...
  courseSlug={courseSlug}
  moduleSlug={moduleSlug}
/>
```

**Step 5: Commit**

```bash
cd app
git add "src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx"
git add "src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx"
git commit -m "feat(analytics): quiz_started and quiz_reset client events"
```

---

## Task 9: Dashboard events (dashboard_viewed, continue_learning_clicked)

**Files:**
- Create: `app/src/components/dashboard/dashboard-analytics.tsx`
- Create: `app/src/components/dashboard/todays-focus-card.tsx`
- Modify: `app/src/app/dashboard/page.tsx`

The dashboard page is a Server Component. We need two new client components — one for the page-view event, one for the CTA click.

**Step 1: Create DashboardAnalytics**

Create `app/src/components/dashboard/dashboard-analytics.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

export function DashboardAnalytics({ nextActionType }: { nextActionType: string | null }) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture('dashboard_viewed', {
      next_action_type: nextActionType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

**Step 2: Extract TodaysFocusCard as a client component**

`TodaysFocusCard` is currently a server function inside `dashboard/page.tsx`. Extract it to a new file as a client component so we can add `usePostHog`.

Create `app/src/components/dashboard/todays-focus-card.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import { Diamond, Play, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import type { NextAction } from '@/lib/data';

function getActionConfig(action: Exclude<NextAction, null | { type: 'all_done' }>) {
  switch (action.type) {
    case 'start':
      return {
        Icon: Sparkles, iconColor: 'text-primary', iconBg: 'bg-primary/10',
        headline: 'Start your journey', subtext: action.course.title, cta: 'Begin', href: action.href,
      };
    case 'lesson':
      return {
        Icon: Play, iconColor: 'text-primary', iconBg: 'bg-primary/10',
        headline: 'Pick up where you left off', subtext: action.moduleTitle, cta: 'Continue', href: action.href,
      };
    case 'quiz':
      return {
        Icon: Diamond, iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10',
        headline: 'Time to test yourself', subtext: action.moduleTitle, cta: 'Take the quiz', href: action.href,
      };
    case 'next_course':
      return {
        Icon: Sparkles, iconColor: 'text-primary', iconBg: 'bg-primary/10',
        headline: 'Ready for the next challenge', subtext: action.course.title, cta: 'Start Course', href: action.href,
      };
  }
}

export function TodaysFocusCard({ action }: { action: NextAction }) {
  const posthog = usePostHog();

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
  // Extract courseSlug from href: /dashboard/course/{courseSlug}/...
  const courseSlug = href.split('/')[3] ?? '';

  return (
    <div className="container mx-auto px-6 pt-4 pb-0">
      <Link
        href={href}
        onClick={() => {
          posthog?.capture('continue_learning_clicked', {
            next_action_type: action.type,
            course_slug: courseSlug,
          });
        }}
        className="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 hover:border-primary/40 hover:bg-primary/[0.08] transition-all"
      >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
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
```

**Step 3: Update dashboard/page.tsx**

In `app/src/app/dashboard/page.tsx`:
1. Import the two new components
2. Remove the `TodaysFocusCard` and `getActionConfig` definitions from the file
3. Add `<DashboardAnalytics>` inside the authenticated block

```tsx
import { DashboardAnalytics } from '@/components/dashboard/dashboard-analytics';
import { TodaysFocusCard } from '@/components/dashboard/todays-focus-card';

// In DashboardPage return:
return (
  <div className="min-h-screen">
    <HeroSection firstName={firstName} streak={streak} />

    {userId && courses.length > 0 && (
      <>
        <DashboardAnalytics nextActionType={nextAction?.type ?? null} />
        <TodaysFocusCard action={nextAction} />
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-10">
          {tracks.map(({ tag, courses: trackCourses }) => (
            <TrackSection key={tag} tag={tag} courses={trackCourses} courseProgress={courseProgress} />
          ))}
          <RoadmapCTABanner />
        </div>
      </>
    )}

    {!userId && <UnauthenticatedCTA />}
  </div>
);
```

**Step 4: Verify events**

Go to `/dashboard`. PostHog should show `dashboard_viewed` with the correct `next_action_type`. Click the TodaysFocusCard — `continue_learning_clicked` should fire.

**Step 5: Commit**

```bash
cd app
git add src/components/dashboard/dashboard-analytics.tsx
git add src/components/dashboard/todays-focus-card.tsx
git add src/app/dashboard/page.tsx
git commit -m "feat(analytics): dashboard_viewed and continue_learning_clicked events"
```

---

## Task 10: Account events (subscribe_clicked)

**Files:**
- Modify: `app/src/components/shared/account-page.tsx`

**Step 1: Add subscribe_clicked tracking**

In `account-page.tsx`, find the `setUpgradeOpen(true)` call (the button that opens the subscription modal). Wrap it in a named handler:

```tsx
import { usePostHog } from 'posthog-js/react';

// Inside AccountPage:
const posthog = usePostHog();

function handleUpgradeClick() {
  posthog?.capture('subscribe_clicked', { plan: 'monthly' });
  setUpgradeOpen(true);
}

// Replace the onClick that calls setUpgradeOpen(true) with handleUpgradeClick:
// <button onClick={handleUpgradeClick} ...>Upgrade to Pro</button>
```

Read the file first to find the exact element before modifying.

**Step 2: Commit**

```bash
cd app
git add src/components/shared/account-page.tsx
git commit -m "feat(analytics): subscribe_clicked event on upgrade modal open"
```

---

## Task 11: Server-side events via Node SDK (quiz_submitted, subscription_activated)

**Files:**
- Create: `app/src/lib/posthog-server.ts`
- Modify: `app/src/app/api/quiz/submit/route.ts`
- Modify: `app/src/app/api/paypal/webhook/route.ts`
- Modify: `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx` (pass slugs in POST body)

**Step 1: Create PostHog Node SDK singleton**

Create `app/src/lib/posthog-server.ts`:

```ts
import { PostHog } from 'posthog-node';

// Create a new client per request — Next.js serverless functions don't share global state
export function getPostHog(): PostHog {
  return new PostHog(process.env.POSTHOG_API_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,        // flush immediately (no batching in serverless)
    flushInterval: 0,
  });
}
```

**Step 2: Add quiz_submitted event in quiz/submit route**

In `app/src/app/api/quiz/submit/route.ts`:

Accept `courseSlug` and `moduleSlug` in the request body (alongside existing `moduleId`, `answers`, `courseId`):

```ts
const { moduleId, answers, courseId, courseSlug, moduleSlug } = await req.json();
```

After the upsert (inside the `if (userId)` block), before `return NextResponse.json(...)`:

```ts
import { getPostHog } from '@/lib/posthog-server';

// After upsert succeeds:
if (userId) {
  try {
    await sql`INSERT INTO user_quiz_attempts ...`; // existing upsert
  } catch (attemptError) {
    console.error('Error saving quiz attempt:', attemptError);
  }

  // Fire PostHog event — after upsert, before return:
  const ph = getPostHog();
  ph.capture({
    distinctId: userId,
    event: 'quiz_submitted',
    properties: {
      course_slug: courseSlug ?? courseId,   // fall back to ID if slug not sent
      module_slug: moduleSlug ?? moduleId,
      score,
      passed,
    },
  });
  await ph.shutdown();
}

return NextResponse.json({ score, passed, correctAnswers });
```

**Step 3: Pass slugs in quiz submit from quiz-player.tsx**

In `quiz-player.tsx`, in `handleSubmit`, add `courseSlug` and `moduleSlug` to the POST body:

```ts
body: JSON.stringify({
  moduleId,
  answers,
  courseId,
  courseSlug,   // ADD
  moduleSlug,   // ADD
}),
```

(These props are already added to `QuizPlayer` in Task 8.)

**Step 4: Add subscription_activated event in webhook route**

In `app/src/app/api/paypal/webhook/route.ts`, after the UPDATE, fire a PostHog event only for the ACTIVATED event type:

```ts
import { getPostHog } from '@/lib/posthog-server';

// Current code:
if (newStatus && subscriptionId) {
  await sql`
    UPDATE user_subscriptions
    SET status = ${newStatus}, updated_at = NOW()
    WHERE subscription_id = ${subscriptionId}
  `;

  // ADD: fire PostHog event for activations only
  if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const rows = await sql`
      SELECT user_id FROM user_subscriptions
      WHERE subscription_id = ${subscriptionId}
      LIMIT 1
    `;
    const userId = rows[0]?.user_id as string | undefined;
    if (userId) {
      const ph = getPostHog();
      ph.capture({
        distinctId: userId,
        event: 'subscription_activated',
        properties: {
          plan: 'monthly',
          paypal_subscription_id: subscriptionId,
        },
      });
      await ph.shutdown();
    }
  }
}
```

**Step 5: Verify events**

1. Submit a quiz in the app. Check PostHog Live Events for `quiz_submitted` with correct `score` and `passed`.
2. Use the PayPal sandbox to trigger a `BILLING.SUBSCRIPTION.ACTIVATED` event. Check PostHog for `subscription_activated`.

**Step 6: Commit**

```bash
cd app
git add src/lib/posthog-server.ts
git add src/app/api/quiz/submit/route.ts
git add src/app/api/paypal/webhook/route.ts
git add "src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/quiz-player.tsx"
git commit -m "feat(analytics): server-side PostHog events — quiz_submitted, subscription_activated"
```

---

## Final verification

**Step 1: Type-check both apps**

```bash
cd app && npx tsc --noEmit
cd ../web && npx tsc --noEmit
```

Expected: no errors.

**Step 2: Build both apps**

```bash
cd app && npm run build
cd ../web && npm run build
```

Expected: both build cleanly.

**Step 3: End-to-end funnel check**

1. Open `zuzu.codes` in incognito → note anon ID in PostHog Live Events
2. Scroll to pricing → `pricing_viewed` fires
3. Expand an FAQ item → `faq_expanded` fires
4. Click a CTA → URL has `?phDistinctId=...`
5. Sign in to `app.zuzu.codes` → `sign_in_completed` fires, person profile created
6. Go to dashboard → `dashboard_viewed` fires; click TodaysFocusCard → `continue_learning_clicked` fires
7. Open a lesson → `lesson_started` fires; click Run → `code_run` fires; pass all tests → `lesson_completed` fires
8. Take a quiz → `quiz_started` fires; submit → `quiz_submitted` fires (server-side)
9. Go to Account, click Upgrade → `subscribe_clicked` fires

**Step 4: Verify session replay masks code**

In PostHog → Recordings, open a session where the user typed code. The CodeMirror editor area should be masked (black box or hidden). Other interactions should be visible.
