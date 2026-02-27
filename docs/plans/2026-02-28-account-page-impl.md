# Account Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fragmented `/account/[path]` route and scattered `UserButton`/`SettingsDialog` with a unified `/account` page, an `AccountModal`, and a `SidebarUserCard` in the sidebar footer — all sharing one `AccountContent` component.

**Architecture:** `AccountContent` is a shared client component (renders Neon Auth cards + subscription card) that accepts `user` and `subscription` props. The `/account` route fetches data server-side and renders it full-page. `AccountModal` wraps the same component in a Dialog and is opened from `SidebarUserCard`. `AppSidebar` gets `user` + `subscription` as new props passed from `dashboard/layout.tsx` (which already fetches both). `DashboardHeader` and `UserButton` are deleted — ThemeToggle moves to `SidebarUserCard`.

**Tech Stack:** Next.js 16 App Router, Neon Auth (`@neondatabase/auth/react` — `AccountSettingsCards`, `SecuritySettingsCards`), shadcn/ui Dialog, Tailwind CSS v4, `lucide-react`.

---

## Context

**Working directory:** `app/`

**Key existing types (from `src/lib/data.ts`):**
```typescript
export type SubscriptionRow = {
  subscription_id: string;
  plan_id: string;
  status: string;          // 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED'
  trial_end_at: string | null;
  next_billing_at: string | null;
};
```

**`dashboard/layout.tsx` already has:**
```typescript
const subscription = await getSubscriptionStatus(user.id); // SubscriptionRow | null
const isPaid = subscription?.status === 'ACTIVE';
```
The layout passes `isPaid` to `SubscriptionProvider` but does NOT yet pass `subscription` or `user` to `AppSidebar`.

**`AppSidebar` (client component)** currently has props: `courses`, `courseProgress`, `contentCompletion`, `stats`. Its `<SidebarFooter>` shows only `© 2026 zuzu.codes`.

**`CoursePlayerShell`** uses both `ThemeToggle` and `{isAuthenticated && <UserButton />}`. After this plan, `UserButton` is gone — remove that line and the `isAuthenticated` prop.

**`SettingsDialog`** (`src/components/shared/settings-dialog.tsx`) is NOT imported anywhere — it is safe to delete.

**`UserButton`** is imported in `dashboard/header.tsx` and `course-player-shell.tsx`.

---

## Task 1: Create `AccountContent` component

**Files:**
- Create: `src/components/shared/account-content.tsx`

**Step 1: Create the file**

```typescript
// src/components/shared/account-content.tsx
'use client';

import { AccountSettingsCards, SecuritySettingsCards } from '@neondatabase/auth/react';
import type { SubscriptionRow } from '@/lib/data';

interface AccountContentProps {
  subscription: SubscriptionRow | null;
}

function SubscriptionBadge({ status }: { status: string | undefined }) {
  if (!status || status === 'FREE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Free
      </span>
    );
  }
  const map: Record<string, { label: string; color: string }> = {
    ACTIVE:    { label: 'Active',    color: 'bg-green-500' },
    CANCELLED: { label: 'Cancelled', color: 'bg-destructive' },
    SUSPENDED: { label: 'Suspended', color: 'bg-amber-500' },
    EXPIRED:   { label: 'Expired',   color: 'bg-muted-foreground/50' },
  };
  const cfg = map[status] ?? { label: status, color: 'bg-muted-foreground/50' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AccountContent({ subscription }: AccountContentProps) {
  return (
    <div className="space-y-8">
      {/* Profile */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Profile</h2>
        <AccountSettingsCards />
      </section>

      {/* Security */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Security</h2>
        <SecuritySettingsCards />
      </section>

      {/* Subscription */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-4">Subscription</h2>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Subscription</span>
            <SubscriptionBadge status={subscription?.status} />
          </div>
          {subscription?.trial_end_at && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Trial ends</span>
              <span>{formatDate(subscription.trial_end_at)}</span>
            </div>
          )}
          {subscription?.next_billing_at && subscription.status === 'ACTIVE' && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Next billing</span>
              <span>{formatDate(subscription.next_billing_at)}</span>
            </div>
          )}
          {!subscription && (
            <p className="text-xs text-muted-foreground">
              No active subscription. Subscribe to unlock all lessons and quizzes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/shared/account-content.tsx
git commit -m "feat: add AccountContent component with profile, security, subscription sections"
```

---

## Task 2: Create `/account` route page

**Files:**
- Delete: `src/app/account/[path]/page.tsx`
- Create: `src/app/account/page.tsx`

**Step 1: Delete old route**

```bash
rm src/app/account/[path]/page.tsx
rmdir src/app/account/[path]
```

**Step 2: Create the new page**

```typescript
// src/app/account/page.tsx
import { auth } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/lib/data';
import { redirect } from 'next/navigation';
import { AccountContent } from '@/components/shared/account-content';

export default async function AccountPage() {
  const { user } = await auth();
  if (!user) redirect('/');

  const subscription = await getSubscriptionStatus(user.id);

  return (
    <main className="container max-w-xl py-8 px-4">
      <h1 className="text-xl font-semibold mb-8">Account</h1>
      <AccountContent subscription={subscription} />
    </main>
  );
}
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Verify route renders**

```bash
npm run dev
# Open http://localhost:3000/account — should show Profile, Security, Subscription sections
```

**Step 5: Commit**

```bash
git add src/app/account/page.tsx
git commit -m "feat: add unified /account route with profile, security, subscription"
```

---

## Task 3: Create `AccountModal`

**Files:**
- Create: `src/components/shared/account-modal.tsx`

**Step 1: Create the file**

```typescript
// src/components/shared/account-modal.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { AccountContent } from './account-content';
import type { SubscriptionRow } from '@/lib/data';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionRow | null;
}

export function AccountModal({ open, onOpenChange, subscription }: AccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Account</DialogTitle>
        <div className="overflow-y-auto max-h-[80vh] p-6">
          <AccountContent subscription={subscription} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/shared/account-modal.tsx
git commit -m "feat: add AccountModal wrapping AccountContent in a Dialog"
```

---

## Task 4: Create `SidebarUserCard`

**Files:**
- Create: `src/components/shared/sidebar-user-card.tsx`

This replaces the `© 2026 zuzu.codes` copyright line in the sidebar footer. It shows avatar + name + email + subscription badge, with three actions: link to `/account`, open `AccountModal`, and `ThemeToggle`.

**Step 1: Create the file**

```typescript
// src/components/shared/sidebar-user-card.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { AccountModal } from './account-modal';
import type { SubscriptionRow } from '@/lib/data';

interface SidebarUserCardProps {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  subscription: SubscriptionRow | null;
}

function StatusDot({ status }: { status: string | undefined }) {
  const colorMap: Record<string, string> = {
    ACTIVE:    'bg-green-500',
    CANCELLED: 'bg-destructive',
    SUSPENDED: 'bg-amber-500',
    EXPIRED:   'bg-muted-foreground/40',
  };
  const color = status ? (colorMap[status] ?? 'bg-muted-foreground/40') : 'bg-muted-foreground/30';
  const label = status === 'ACTIVE' ? 'Active' : status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Free';
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${color} shrink-0`} />
      {label}
    </span>
  );
}

export function SidebarUserCard({ user, subscription }: SidebarUserCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="relative h-7 w-7 shrink-0">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              fill
              className="rounded-md object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-muted/50 font-mono text-[10px] font-medium tracking-wider text-foreground/60">
              {initials}
            </div>
          )}
        </div>

        {/* Name + email + badge */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate leading-none mb-0.5">
            {displayName}
          </p>
          <StatusDot status={subscription?.status} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Account settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        subscription={subscription}
      />
    </>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/shared/sidebar-user-card.tsx
git commit -m "feat: add SidebarUserCard with avatar, subscription badge, theme toggle, account modal"
```

---

## Task 5: Wire `SidebarUserCard` into `AppSidebar` + `dashboard/layout.tsx`

**Files:**
- Modify: `src/components/shared/app-sidebar.tsx`
- Modify: `src/app/dashboard/layout.tsx`

### Part A — `app-sidebar.tsx`

**Step 1: Add imports at the top of `app-sidebar.tsx`**

After the existing imports block, add:
```typescript
import { SidebarUserCard } from '@/components/shared/sidebar-user-card';
import type { SubscriptionRow } from '@/lib/data';
```

**Step 2: Extend `AppSidebarProps`**

Change:
```typescript
interface AppSidebarProps {
  courses: CourseWithModules[];
  courseProgress?: Record<string, SidebarCourseProgress>;
  contentCompletion?: Record<string, SectionStatus>;
  stats?: DashboardStats;
}
```

To:
```typescript
interface AppSidebarProps {
  courses: CourseWithModules[];
  courseProgress?: Record<string, SidebarCourseProgress>;
  contentCompletion?: Record<string, SectionStatus>;
  stats?: DashboardStats;
  user: { name: string | null; email: string | null; image: string | null };
  subscription: SubscriptionRow | null;
}
```

**Step 3: Destructure new props in `AppSidebar`**

Change the function signature from:
```typescript
export function AppSidebar({
  courses,
  courseProgress,
  contentCompletion = {},
  stats,
}: AppSidebarProps) {
```

To:
```typescript
export function AppSidebar({
  courses,
  courseProgress,
  contentCompletion = {},
  stats,
  user,
  subscription,
}: AppSidebarProps) {
```

**Step 4: Replace `<SidebarFooter>` content**

Find and replace the entire `<SidebarFooter>` block:

Old:
```typescript
      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 h-12 flex items-center justify-center px-4">
        <p className="text-[10px] text-muted-foreground text-center">
          &copy; 2026 zuzu.codes
        </p>
      </SidebarFooter>
```

New:
```typescript
      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 px-2 py-2">
        <SidebarUserCard user={user} subscription={subscription} />
      </SidebarFooter>
```

### Part B — `dashboard/layout.tsx`

**Step 5: Pass `user` and `subscription` to `AppSidebar`**

Find:
```typescript
        <AppSidebar
          courses={courses}
          courseProgress={courseProgress}
          contentCompletion={contentCompletion}
          stats={stats}
        />
```

Replace with:
```typescript
        <AppSidebar
          courses={courses}
          courseProgress={courseProgress}
          contentCompletion={contentCompletion}
          stats={stats}
          user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
          subscription={subscription}
        />
```

**Step 6: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Visual check**

```bash
npm run dev
# Open http://localhost:3000/dashboard
# Sidebar footer should show: avatar initials + name + status dot + ThemeToggle + settings gear
# Clicking gear should open AccountModal
```

**Step 8: Commit**

```bash
git add src/components/shared/app-sidebar.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add SidebarUserCard to AppSidebar footer, pass user + subscription from layout"
```

---

## Task 6: Cleanup — delete old files, remove UserButton from CoursePlayerShell, delete DashboardHeader

**Files:**
- Delete: `src/components/shared/user-button.tsx`
- Delete: `src/components/shared/settings-dialog.tsx`
- Delete: `src/components/dashboard/header.tsx`
- Modify: `src/components/course/course-player-shell.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: All course pages that pass `isAuthenticated` to `CoursePlayerShell`

### Step 1: Remove `UserButton` + `isAuthenticated` from `CoursePlayerShell`

In `src/components/course/course-player-shell.tsx`:

1. Remove this import line:
```typescript
import { UserButton } from '@/components/shared/user-button';
```

2. Remove `isAuthenticated?: boolean;` from `CoursePlayerShellProps`

3. Remove `isAuthenticated = false,` from the function destructuring

4. Remove the `UserButton` usage in the header:
```typescript
          {isAuthenticated && <UserButton />}
```
The header `<div className="flex items-center gap-1.5 shrink-0">` that wraps `ThemeToggle` + `UserButton` becomes just:
```typescript
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
        </div>
```

### Step 2: Remove `isAuthenticated` prop from all course pages

Run this to find all usages:
```bash
grep -r "isAuthenticated" src/app --include="*.tsx" -l
```

For each file found, remove the `isAuthenticated={!!user}` (or equivalent) prop from the `<CoursePlayerShell>` call.

The files are:
- `src/app/dashboard/course/[courseSlug]/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/quiz/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/intro/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/outro/page.tsx`
- `src/app/dashboard/course/[courseSlug]/[moduleSlug]/outro/page.tsx`
- `src/app/dashboard/course/[courseSlug]/graduation/page.tsx`
- `src/app/dashboard/course/[courseSlug]/certificate/page.tsx`

In each file, find `isAuthenticated={...}` and delete that line.

### Step 3: Remove `DashboardHeader` from `dashboard/layout.tsx`

In `src/app/dashboard/layout.tsx`:

1. Remove the import:
```typescript
import { DashboardHeader } from "@/components/dashboard/header";
```

2. Remove the `<DashboardHeader />` JSX line from the return.

### Step 4: Delete the unused files

```bash
rm src/components/shared/user-button.tsx
rm src/components/shared/settings-dialog.tsx
rm src/components/dashboard/header.tsx
```

### Step 5: Type-check + lint

```bash
cd app && npx tsc --noEmit && npm run lint
```

Expected: no errors. No references to `UserButton`, `SettingsDialog`, or `DashboardHeader` should remain.

### Step 6: Build check

```bash
npm run build
```

Expected: ✓ Compiled successfully.

### Step 7: Commit

```bash
git add -A
git commit -m "feat: remove UserButton/SettingsDialog/DashboardHeader, clean up CoursePlayerShell"
```

---

## Verification Checklist

- [ ] `/account` renders Profile, Security, Subscription sections
- [ ] Subscription card shows correct status badge for active/free/cancelled states
- [ ] Sidebar footer shows avatar + name + status dot + ThemeToggle + gear icon
- [ ] Clicking gear opens AccountModal with same three sections
- [ ] ThemeToggle in sidebar card switches theme correctly
- [ ] Dashboard header (non-course pages) has no profile icon or theme toggle
- [ ] Course player shell header shows only ThemeToggle (no avatar/profile)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] `npm run build` passes
