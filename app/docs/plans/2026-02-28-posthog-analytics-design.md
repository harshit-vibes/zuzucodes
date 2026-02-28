# PostHog Analytics Design

**Goal:** Instrument the zuzu.codes platform with PostHog analytics to measure conversion, activation, and retention — working backwards from metrics to events.

**Approach:** Client-side PostHog JS SDK in both apps + PostHog Node SDK in key API routes for server-authoritative events. Cross-domain identity stitching between `zuzu.codes` (landing) and `app.zuzu.codes` (platform). Session replay enabled with code editor masked.

**Tech Stack:** `posthog-js` (browser), `posthog-node` (API routes), Next.js App Router, two apps (`app/` and `web/`).

---

## Metrics → Funnels → Events

### Conversion (Landing → Subscription)

| Metric | Question answered |
|---|---|
| Landing → Sign-up rate | Is the landing page compelling? |
| Sign-up → First lesson rate | Does onboarding drop people off? |
| First lesson → Subscription rate | Does the product sell itself? |
| CTA click-through by section | Which section converts best? |

### Activation (First session quality)

| Metric | Question answered |
|---|---|
| % who run code in first session | Are learners actually doing the work? |
| % who pass first test | Is lesson 1 the right difficulty? |
| Time to first test pass | How long does activation take? |
| % who complete lesson 1 | Full first-lesson completion rate |

### Retention (Habit formation)

| Metric | Question answered |
|---|---|
| Day 1 / Day 7 / Day 30 return rate | Is the habit forming? |
| Lessons per session | Session depth |
| Streak length distribution | Are streaks a meaningful signal? |
| Quiz retry rate | How hard are quizzes? |

---

## Architecture

### Initialization

**`app/` (platform):** A `<PostHogProvider>` client component wraps the root layout (`app/src/app/layout.tsx`). Initializes PostHog JS, enables session replay, and calls `posthog.identify(userId, { email, name, subscription_status })` immediately after auth resolves.

**`web/` (landing):** Same `<PostHogProvider>` pattern, anonymous — no `identify()` call. PostHog assigns `$anon_distinct_id` automatically.

Both apps use the same PostHog project key (`NEXT_PUBLIC_POSTHOG_KEY`).

### Cross-Domain Identity Stitching

When a user clicks a CTA on the landing page, pass their PostHog anonymous ID as a query param to the sign-up URL:

```
https://app.zuzu.codes/auth/sign-in?phDistinctId=<anon_id>
```

On sign-in success, the app calls `posthog.identify(userId)` with the `$anon_distinct_id` from the query param. PostHog merges both sessions into one person profile — the full funnel from first landing page visit through to subscription becomes a single user journey.

### Server-Side Events (Node SDK)

Three API routes instrumented with `posthog-node`:

| Route | Event | Why server-side |
|---|---|---|
| `POST /api/code/test` | `code_tested` | Authoritative pass/fail result |
| `POST /api/quiz/submit` | `quiz_submitted` | Score computed server-side |
| `POST /api/paypal/webhook` | `subscription_activated` | Payment must never be missed |

### Session Replay

Enabled on both apps. The CodeMirror editor (`#code-editor`) is excluded from recording so user code is never captured. All other interactions — clicks, navigation, quiz, payment modal — are recorded.

---

## Event Taxonomy

All events use `snake_case`. PostHog standard properties (`$current_url`, `$session_id`, etc.) are captured automatically.

### Landing Page (`web/`)

| Event | Trigger | Key properties |
|---|---|---|
| `page_viewed` | Auto (PostHog pageview) | — |
| `cta_clicked` | Any "Get Started" / "Sign Up" button | `section: hero\|pricing\|footer_cta\|header`, `text` |
| `pricing_viewed` | Pricing section scrolls into view | — |
| `faq_expanded` | FAQ accordion item opened | `question` |

### Auth (`app/`)

| Event | Trigger | Key properties |
|---|---|---|
| `sign_up_started` | User submits email on sign-up | `method: otp\|google` |
| `sign_up_completed` | First successful session created | `method: otp\|google` |
| `sign_in_completed` | Returning user signs in | `method: otp\|google` |

### Course Player (`app/`)

| Event | Trigger | Key properties |
|---|---|---|
| `lesson_started` | Lesson page mounted | `course_slug`, `module_slug`, `lesson_index`, `lesson_title` |
| `code_run` | Run button clicked | `course_slug`, `module_slug`, `lesson_index`, `phase: run-pass\|run-fail\|error\|tle` |
| `lesson_completed` | All tests pass + confetti fires | `course_slug`, `module_slug`, `lesson_index`, `attempts` |
| `quiz_started` | Quiz page mounted | `course_slug`, `module_slug` |
| `quiz_submitted` | Quiz POST resolves | `course_slug`, `module_slug`, `score`, `passed`, `attempt_number` |
| `quiz_reset` | User retries quiz | `course_slug`, `module_slug` |

### Dashboard (`app/`)

| Event | Trigger | Key properties |
|---|---|---|
| `dashboard_viewed` | Dashboard page mounted | `next_action_type: start\|lesson\|quiz\|next_course\|all_done` |
| `continue_learning_clicked` | TodaysFocusCard CTA clicked | `next_action_type`, `course_slug` |

### Account & Payments (`app/`)

| Event | Trigger | Key properties |
|---|---|---|
| `subscribe_clicked` | Subscribe button in account | `plan` |
| `subscription_activated` | PayPal webhook confirms activation | `plan`, `paypal_subscription_id` |
| `account_updated` | Profile/email/password changed | `field: name\|email\|password` |

### User Properties (set on `identify`)

```
subscription_status: free | active | cancelled
lessons_completed:   number
streak:              number
created_at:          ISO date
```

---

## What is NOT in scope (v1)

- Feature flags / A/B testing
- PostHog reverse proxy (can add later if ad-block becomes an issue)
- Custom dashboards in PostHog UI (set up manually after data flows in)
- Error monitoring (separate concern — Sentry)
