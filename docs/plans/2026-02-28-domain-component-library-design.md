# Domain Strategy + Component Library Design

**Date:** 2026-02-28

---

## Part 1: Domain Strategy

### Decision: Split to `zuzu.codes` + `app.zuzu.codes`

**Current state:** Both `web/` (landing) and `app/` (platform) are deployed under a single domain.

**Target state:**
- `zuzu.codes` → `web/` Next.js landing (eventually Framer)
- `app.zuzu.codes` → `app/` Next.js platform

### Why split now

| Concern | Current (one domain) | After split |
|---------|----------------------|-------------|
| **SEO** | `/dashboard`, `/auth`, `/account` routes may get indexed; no canonical separation between marketing and app content | Marketing pages live cleanly on apex; app routes never appear in search |
| **Auth** | Session cookies are domain-scoped; one leaked path can compromise the other | Cookies scoped to `app.zuzu.codes` — smaller blast radius, cleaner security boundary |
| **Deploy independence** | A broken `app/` build can affect `web/` and vice versa (shared CDN edge, same Vercel project) | Separate Vercel projects; deploy platform fixes without touching landing |
| **Framer migration** | Moving `web/` to Framer while on the same domain requires coordinating two deploys | `zuzu.codes` transfers cleanly to Framer; `app/` stays on Vercel untouched |

### Why Option C (rewrites) was rejected

Serving `app.zuzu.codes` through `zuzu.codes/dashboard` via rewrites looks clean for users but:
- Cookies still can't be shared across origin — auth still needs `app.zuzu.codes`
- Rewrites add a latency hop
- Doesn't actually unify the two apps — they're still separate deployments
- Complexity with no real payoff

### Implementation checklist (not an implementation plan — for reference)

1. Create second Vercel project pointing at `app/`
2. Assign `app.zuzu.codes` subdomain in Vercel + DNS
3. Update env vars: `NEXT_PUBLIC_APP_URL=https://app.zuzu.codes`, `NEXT_PUBLIC_ROOT_DOMAIN=zuzu.codes`
4. Update Neon Auth allowed origins to include `app.zuzu.codes`
5. Verify auth cookie `domain` attribute — should be `app.zuzu.codes` (not `.zuzu.codes` unless cross-subdomain sessions are intentional)
6. Update any hardcoded URLs in `web/` that link to `/dashboard` → `https://app.zuzu.codes/dashboard`
7. Set up `zuzu.codes` redirect for old `/dashboard` paths → `app.zuzu.codes/dashboard` (301)

### Framer migration path

When `web/` moves to Framer:
- `zuzu.codes` DNS A/CNAME points to Framer
- Old `web/` Vercel project decommissioned
- `app.zuzu.codes` is already live — no changes needed on app side
- The split done today is the permanent end state

---

## Part 2: Component Library (within `app/`)

### Decision: Domain-based folder structure (Option 1)

No new tooling. The structure enforces ownership and prevents `components/` from becoming a junk drawer.

### Tier definitions

```
app/src/components/
├── ui/           # shadcn/ui primitives — NEVER modified directly
│                 # Add shadcn components here via `npx shadcn@latest add`
│                 # Examples: Button, Card, Input, Dialog, Sidebar, Badge
│
├── core/         # Custom branded variants of ui/ primitives
│                 # Use when shadcn variant system isn't enough
│                 # Examples: GradientButton, ProBadge, ProgressRing
│                 # Currently empty — add here when needed, not before
│
├── shared/       # Cross-feature components used in 2+ domains
│                 # No domain-specific logic; no direct DB types
│                 # Examples: AppSidebar, Markdown, UserButton, ThemeToggle,
│                 #           PaywallOverlay, SubscribeModal, AuthDialog, ThemeProvider
│
├── dashboard/    # Dashboard feature only (/dashboard root)
│                 # Examples: CourseGrid, ActivityHeatmap, ContinueLearning
│
├── course/       # Course player shell + navigation
│                 # Examples: CoursePlayerShell, CourseSidebar
│
└── lesson/       # Lesson player internals
                  # Examples: CodeLessonLayout, ProblemPanel, CodeEditor, OutputPanel
```

### Current state audit

The existing structure already maps well to this model. No major moves required.

| Component | Current location | Correct location | Action |
|-----------|-----------------|------------------|--------|
| `app-sidebar.tsx` | `shared/` | `shared/` | ✅ stay |
| `auth-dialog.tsx` | `shared/` | `shared/` | ✅ stay |
| `markdown.tsx` | `shared/` | `shared/` | ✅ stay |
| `user-button.tsx` | `shared/` | `shared/` | ✅ stay |
| `theme-toggle.tsx` | `shared/` | `shared/` | ✅ stay |
| `theme-provider.tsx` | `shared/` | `shared/` | ✅ stay |
| `paywall-overlay.tsx` | `shared/` | `shared/` | ✅ stay |
| `subscribe-modal.tsx` | `shared/` | `shared/` | ✅ stay |
| `course-player-shell.tsx` | `course/` | `course/` | ✅ stay |
| `code-lesson-layout.tsx` | `lesson/` | `lesson/` | ✅ stay |
| `problem-panel.tsx` | `lesson/` | `lesson/` | ✅ stay |
| `code-editor.tsx` | `lesson/` | `lesson/` | ✅ stay |
| `output-panel.tsx` | `lesson/` | `lesson/` | ✅ stay |

**Verdict:** Current structure is already correct. The value of this design is formalising the rules so future components are placed correctly.

### Rules

1. **`ui/` is read-only.** Add via shadcn CLI only. Never edit generated files. If a variant is missing, add it to `core/` instead.

2. **`shared/` requires the 2+ domains test.** If a component is only used in one feature domain, it belongs in that domain folder. Resist the urge to put everything in `shared/`.

3. **Domain folders are flat.** No sub-folders within `lesson/` or `course/`. If a domain folder exceeds ~10 files, reconsider whether it needs splitting into a new domain.

4. **`core/` starts empty — add when there's a real need.** Don't pre-populate with abstractions you might want someday. YAGNI.

5. **Co-locate hooks with their component.** If a hook is only used by one component, keep it in the same file or an adjacent `use-*.ts` file in the same folder. Only extract to `lib/` if it's used in 3+ places.

6. **Types belong in `lib/` not `components/`.** Component props interfaces stay in their file. Shared domain types (e.g., `LessonData`, `TestCase`) stay in `lib/`.

### When to add a new domain folder

Add a new top-level domain folder when:
- A new feature area emerges with 3+ components that don't fit in existing domains
- Examples of future candidates: `quiz/` (if quiz player grows), `account/` (account settings pages), `onboarding/`

Do not add sub-folders within existing domains — keep it flat.

### Storybook (deferred)

Storybook is worth adding when:
- A second frontend developer joins
- A designer needs to inspect components in isolation
- The `core/` tier grows to 5+ custom primitives

Until then: the folder structure + rules above provide sufficient guardrails with zero tooling overhead.

---

## Summary

| Concern | Decision |
|---------|----------|
| Domain architecture | Split: `zuzu.codes` (web) + `app.zuzu.codes` (platform) |
| Framer migration | `zuzu.codes` transfers cleanly; `app.zuzu.codes` unaffected |
| Component structure | Domain-based tiers: `ui/ core/ shared/ dashboard/ course/ lesson/` |
| Current migration needed | None — existing structure already matches target |
| New tooling | None |
| Storybook | Deferred until team grows |
