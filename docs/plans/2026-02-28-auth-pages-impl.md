# Auth Pages Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bare `/auth/[path]` page with a full-screen immersive branded experience (neural-grid background + gradient orbs + logo bar + glassmorphism auth card) while keeping `<AuthView>` untouched.

**Architecture:** Single file change — `app/src/app/auth/[path]/page.tsx`. The existing `<AuthView path={path} />` is wrapped in a branded shell: a full-screen container with background layers, an absolutely-positioned logo bar (top-left, links to zuzu.codes), and a centered glassmorphism card. No new files, no new components.

**Tech Stack:** Next.js App Router (server component), `BrandLogo` (`app/src/components/shared/brand-logo.tsx`, client component), Tailwind CSS v4, CSS classes `neural-grid` and `glass-premium` from `app/src/app/globals.css`.

---

## Key Facts

- **File to modify:** `app/src/app/auth/[path]/page.tsx` — currently a minimal 17-line server component
- **`BrandLogo`** is at `@/components/shared/brand-logo.tsx` — accepts `width`, `height`, `className` props; theme-aware (shows light/dark logo). It's a `'use client'` component — Next.js handles server/client composition fine.
- **`neural-grid`** CSS class: defined in `globals.css` — dot-grid background using `background-image` linear gradients, `background-size: 40px 40px`
- **`glass-premium`** CSS class: defined in `globals.css` — `background: oklch(1 0 0 / 0.75)` + `backdrop-filter: blur(16px) saturate(1.8)` + `border`. Dark variant: `oklch(0.18 0.015 255 / 0.85)` + blur.
- **Gradient orbs:** Absolutely positioned `div`s with `rounded-full blur-3xl` — same pattern used in `hero-section.tsx` on the landing page
- **`dynamicParams = false`** must stay — it's a Next.js setting that disables dynamic params for this route segment
- **Design tokens:** `--primary` (purple), `bg-card`, `font-display`, `text-muted-foreground`

---

## Task 1: Rewrite auth page with branded shell

**Files:**
- Modify: `app/src/app/auth/[path]/page.tsx`

**Step 1: Read the current file**

The current file is:
```tsx
import { AuthView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView path={path} />
    </main>
  );
}
```

**Step 2: Replace the entire file with**

```tsx
import { AuthView } from '@neondatabase/auth/react';
import { BrandLogo } from '@/components/shared/brand-logo';
import Link from 'next/link';

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-20">

      {/* Background: neural grid */}
      <div className="absolute inset-0 neural-grid opacity-20" />

      {/* Background: gradient orbs */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Logo bar — top left */}
      <div className="absolute top-0 left-0 p-6">
        <Link
          href="https://zuzu.codes"
          className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
        >
          <BrandLogo width={28} height={28} />
          <span className="font-display font-semibold text-lg">zuzu.codes</span>
        </Link>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-sm glass-premium rounded-2xl shadow-lg p-8">
        <AuthView path={path} />
      </div>

    </div>
  );
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors. If `BrandLogo` import fails, check the path — it's at `src/components/shared/brand-logo.tsx` and the alias is `@/components/shared/brand-logo`.

**Step 4: Build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. The auth route compiles as a server component with a nested client `BrandLogo`.

**Step 5: Commit**

```bash
git add app/src/app/auth/[path]/page.tsx
git commit -m "feat: immersive branded auth page (neural grid + glass card + logo)"
```

---

## Task 2: Deploy and smoke test

**Step 1: Deploy**

```bash
cd app && vercel --prod --yes
```

Expected: aliased to `https://app.zuzu.codes`.

**Step 2: Smoke test checklist**

Navigate to `https://app.zuzu.codes/auth/sign-in`:
- [ ] Full-screen background visible (not white blank)
- [ ] Subtle neural-grid dot pattern over the background
- [ ] Gradient orbs — soft purple glow top-right and bottom-left
- [ ] Top-left: zuzu.codes logo + name, clicking it goes to `https://zuzu.codes`
- [ ] Auth card: glassmorphism effect (slightly translucent, blurred background showing through)
- [ ] `AuthView` fully functional — can enter email, receive OTP, sign in
- [ ] Dark mode: switch theme, orbs and card background adapt correctly
- [ ] Mobile (`< 640px`): card is full-width, logo bar still visible

**Step 3: Push**

```bash
git push
```
