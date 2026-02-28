# Sidebar: Feature Tiers Design

> Date: 2026-02-28

## Goal

Give auxiliary course-adjacent features (AI hints, spaced repetition, glossary, etc.) a structured home in the sidebar with clear maturity signals, so adding a new feature = one line of code in the right tier.

## Approved Approach

Three labeled tier sections — **Available / Beta / Preview** — between the Dashboard nav item and the permanent Roadmap utility section. Sections only render when they have items, so the sidebar looks identical to today until the first auxiliary feature ships.

---

## Sidebar Structure (Dashboard Mode)

```
[Logo → /dashboard]
─────────────────────────   border-b
Dashboard

─────────────────────────   thin separator

Available           ← plain SidebarGroupLabel (only if items exist)
  [feature items]

Beta                ← SidebarGroupLabel + amber pill (only if items exist)
  [feature items]

Preview             ← SidebarGroupLabel + purple pill (only if items exist)
  [feature items]

─────────────────────────   only shown when tiers block has items
Roadmap             ← permanent utility, no label
─────────────────────────
[UserCard footer]
```

- Course mode sidebar: unchanged.
- Roadmap: permanent — always visible, below the tier sections.

---

## Tier Labels

| Tier | Label | Pill |
|------|-------|------|
| `available` | Available | None |
| `beta` | Beta | `bg-amber-500/10 text-amber-600 dark:text-amber-400` |
| `preview` | Preview | `bg-purple-500/10 text-purple-600 dark:text-purple-400` |

---

## Adding a New Feature

Edit `FEATURE_ITEMS` in `src/components/shared/app-sidebar.tsx`:

```tsx
const FEATURE_ITEMS: SidebarFeature[] = [
  { title: 'AI Hints', href: '/dashboard/ai-hints', icon: Sparkles, tier: 'preview' },
];
```

No other changes needed.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/shared/app-sidebar.tsx` | Add `FeatureTier` type, `TIER_CONFIG`, `FEATURE_ITEMS`; add `SidebarGroupLabel` import; replace utility nav block with tier-aware rendering |

No migrations. No new routes. No new DB tables.
