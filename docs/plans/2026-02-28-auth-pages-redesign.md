# Auth Pages Redesign

**Date:** 2026-02-28
**Status:** Approved

---

## Goal

Replace the bare, unbranded `/auth/[path]` page with a full-screen immersive experience that communicates the zuzu.codes brand identity while keeping the Neon Auth `<AuthView>` component intact.

---

## Layout

**Full-screen immersive** — auth form floats over a branded background.

### Background layers (bottom to top)

1. `bg-background` base
2. `neural-grid opacity-20` — the dot-grid pattern used on the landing page
3. Two gradient orbs (absolutely positioned):
   - Top-right: `bg-primary/10`, large blurred circle
   - Bottom-left: `bg-accent/5` or `bg-primary/5`, medium blurred circle

### Top-left logo bar

Absolutely positioned (`absolute top-0 left-0 p-6`):
- `<Link href="https://zuzu.codes">` wrapping:
  - `<BrandLogo width={28} height={28} />`
  - `<span className="font-display font-semibold text-lg">zuzu.codes</span>`

### Centered auth card

- `relative z-10` to float above the background layers
- `w-full max-w-sm` — ~400px max width
- `bg-card/80 backdrop-blur-sm` — glassmorphism
- `border rounded-2xl shadow-lg`
- `p-8` padding
- Contains `<AuthView path={path} />`

### Mobile

Card stays `w-full max-w-sm mx-auto` with outer `px-4` padding. Background orbs scale naturally. Logo bar remains at `p-6` top-left.

---

## Component Changes

| File | Change |
|------|--------|
| `app/src/app/auth/[path]/page.tsx` | Wrap `<AuthView>` in branded shell: background layers, logo bar, glassmorphism card |

No new files — layout goes directly in `page.tsx` since it's the only auth route.

---

## Design Tokens Used

- `bg-background` — page base
- `neural-grid` — existing CSS class in `globals.css`
- `bg-primary/10`, `bg-primary/5` — orb colors
- `bg-card/80` + `backdrop-blur-sm` — glassmorphism card
- `border`, `rounded-2xl`, `shadow-lg` — card border/shadow
- `font-display font-semibold` — Playfair Display for brand name

---

## Out of Scope

- Custom email verification UI (Neon Auth handles it)
- Social auth buttons (not enabled)
- Custom form fields (Neon Auth owns the form)
- "Back to homepage" link in footer of card (logo serves this purpose)
