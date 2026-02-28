# Account Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `/account` with a centered standalone layout and 3-tab UI (Profile / Security / Sessions), shared between the page and the existing `AccountModal`, with session-limit enforcement (max 2 active sessions).

**Architecture:** Rewrite `AccountContent` to use shadcn `Tabs` with individual Neon Auth cards. Add `account/layout.tsx` for the centered page shell. Add a `enforceSessionLimit()` server action called non-blocking from `dashboard/layout.tsx`.

**Tech Stack:** Next.js App Router, shadcn `Tabs` (already at `app/src/components/ui/tabs.tsx`), `@neondatabase/auth/react` individual cards, `authServer` from `@neondatabase/auth/next/server`.

---

## Key Facts

- `authServer` is created by `createAuthServer()` in `app/src/lib/auth/server.ts`. It's a `NeonAuthServer = Pick<VanillaBetterAuthClient, ServerAuthMethods>` — methods include `listSessions()`, `revokeSession()`, `revokeSessions()`. They read cookies from the current Next.js request context automatically (same as `authServer.getSession()`).
- Session objects have: `id`, `token`, `createdAt`, `userId`, `expiresAt`, `userAgent`, `ipAddress`. Revoke by `token`.
- `SubscribeModal` requires `open`, `onOpenChange`, and `planId` props. Import `PLAN_ID` from `@/lib/paypal`.
- `shadcn Tabs` is already installed at `app/src/components/ui/tabs.tsx`.
- `AccountModal` (`account-modal.tsx`) and the `/account` page both render `<AccountContent subscription={subscription} />` — changing `AccountContent` updates both at once.
- Design doc: `docs/plans/2026-02-28-account-page-redesign.md`

---

## Task 1: Create `enforceSessionLimit` server action

**Files:**
- Create: `app/src/lib/actions/session-limit.ts`

**Step 1: Create the server action**

```ts
'use server';

import { authServer } from '@/lib/auth/server';

const MAX_SESSIONS = 2;

/**
 * Revokes oldest sessions if the current user has more than MAX_SESSIONS active.
 * Non-blocking — call with `void enforceSessionLimit()` in layout.
 */
export async function enforceSessionLimit() {
  try {
    const result = await authServer.listSessions();
    // better-auth vanilla client returns { data, error }
    const sessions = (result as { data?: { token: string; createdAt: string }[]; error?: unknown }).data;
    if (!sessions || sessions.length <= MAX_SESSIONS) return;

    // Sort ascending by createdAt — oldest first
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Revoke all beyond the MAX_SESSIONS most recent
    const toRevoke = sorted.slice(0, sorted.length - MAX_SESSIONS);
    await Promise.all(
      toRevoke.map((s) =>
        authServer.revokeSession({ token: s.token } as Parameters<typeof authServer.revokeSession>[0])
      )
    );
  } catch {
    // Never break dashboard load
  }
}
```

> **Note:** The cast to `{ data?: ...; error?: unknown }` is needed because the better-auth types are complex. If the TypeScript call fails at the `listSessions()` call, check `node_modules/@neondatabase/auth/dist/next/server/index.d.mts` for the exact signature and adjust the call (may need `{ fetchOptions: { headers } }` wrapper).

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: no new errors (cast handles type complexity). If `revokeSession` shape is wrong, the only fix needed is the argument shape — check the type definition.

**Step 3: Commit**

```bash
git add app/src/lib/actions/session-limit.ts
git commit -m "feat: add enforceSessionLimit server action (max 2 active sessions)"
```

---

## Task 2: Call `enforceSessionLimit` in dashboard layout

**Files:**
- Modify: `app/src/app/dashboard/layout.tsx`

**Step 1: Add import**

After the existing imports, add:
```ts
import { enforceSessionLimit } from "@/lib/actions/session-limit";
```

**Step 2: Add the non-blocking call**

In `DashboardLayout`, after the `auth()` call and `redirect` check, add:
```ts
// Enforce max 2 active sessions — fire and forget
void enforceSessionLimit();
```

Example placement (after the existing user check):
```ts
const { session, user } = await auth();
if (!user) {
  redirect("/auth/sign-in");
}

void enforceSessionLimit();
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/src/app/dashboard/layout.tsx
git commit -m "feat: enforce session limit on dashboard load"
```

---

## Task 3: Create centered account page layout

**Files:**
- Create: `app/src/app/account/layout.tsx`
- Modify: `app/src/app/account/page.tsx`

**Step 1: Create the layout file**

```tsx
// app/src/app/account/layout.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b">
            <h1 className="text-base font-semibold">Account</h1>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Simplify `account/page.tsx`**

Replace the entire `page.tsx`:
```tsx
import { auth } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/lib/data';
import { redirect } from 'next/navigation';
import { AccountContent } from '@/components/shared/account-content';

export default async function AccountPage() {
  const { user } = await auth();
  if (!user) redirect('/auth/sign-in');

  const subscription = await getSubscriptionStatus(user.id);

  return <AccountContent subscription={subscription} />;
}
```

(The outer card/heading now comes from `layout.tsx`, so `page.tsx` is just data + render.)

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/src/app/account/layout.tsx app/src/app/account/page.tsx
git commit -m "feat: centered standalone layout for account page"
```

---

## Task 4: Rewrite `AccountContent` with 3-tab UI

This is the core change. `AccountModal` already wraps `AccountContent` — updating this component updates both the page and the modal at once.

**Files:**
- Modify: `app/src/components/shared/account-content.tsx`

**Step 1: Read the current file** (3 sections: Profile, Security, Subscription — all flat, no tabs)

**Step 2: Rewrite the entire file**

```tsx
'use client';

import {
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  SessionsCard,
  DeleteAccountCard,
} from '@neondatabase/auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SubscribeModal } from './subscribe-modal';
import { useState } from 'react';
import { PLAN_ID } from '@/lib/paypal';
import type { SubscriptionRow } from '@/lib/data';

interface AccountContentProps {
  subscription: SubscriptionRow | null;
}

// ─── Subscription status badge ───────────────────────────────────────────────

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
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Subscription card ────────────────────────────────────────────────────────

function SubscriptionCard({ subscription }: { subscription: SubscriptionRow | null }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPaid = subscription?.status === 'ACTIVE';

  return (
    <>
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

        {subscription?.next_billing_at && isPaid && (
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

        <div className="pt-1">
          {isPaid ? (
            <a
              href="https://www.paypal.com/myaccount/autopay/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Manage on PayPal →
            </a>
          ) : (
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <SubscribeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        planId={PLAN_ID}
      />
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AccountContent({ subscription }: AccountContentProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6 w-full justify-start">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
      </TabsList>

      {/* ── Profile ── */}
      <TabsContent value="profile" className="space-y-6 mt-0">
        <UpdateNameCard />
        <SubscriptionCard subscription={subscription} />
      </TabsContent>

      {/* ── Security ── */}
      <TabsContent value="security" className="space-y-6 mt-0">
        <ChangeEmailCard />
        <ChangePasswordCard />
      </TabsContent>

      {/* ── Sessions ── */}
      <TabsContent value="sessions" className="space-y-6 mt-0">
        <div className="rounded-lg border bg-muted/30 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Maximum 2 active sessions allowed per account.
          </p>
        </div>
        <SessionsCard />
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="uppercase tracking-wider">Danger zone</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <DeleteAccountCard />
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

**Step 3: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors. Likely issues:
- `PLAN_ID` is a `string` but the import might need the `app/` working directory
- If `UpdateNameCard`, `ChangeEmailCard`, `ChangePasswordCard`, `SessionsCard`, or `DeleteAccountCard` have required props, wrap them with appropriate values (check types in `@neondatabase/auth/react`)

**Step 4: Commit**

```bash
git add app/src/components/shared/account-content.tsx
git commit -m "feat: rewrite AccountContent with 3-tab UI (Profile/Security/Sessions)"
```

---

## Task 5: Verify AccountModal + dev smoke test

**Files:** No changes needed to `account-modal.tsx` — it already wraps `AccountContent` in a Dialog.

**Step 1: Run dev server**

```bash
cd app && npm run dev
```

**Step 2: Test the `/account` page**

Navigate to `http://localhost:3000/account`:
- [ ] Centered card with `← Dashboard` back link
- [ ] "Account" heading in card header
- [ ] Three tabs: Profile, Security, Sessions
- [ ] Profile tab: name edit card + subscription card
- [ ] Security tab: change email + change password cards
- [ ] Sessions tab: "Maximum 2 active sessions" notice + sessions list + danger zone + delete account

**Step 3: Test the AccountModal**

- Open the sidebar, click the gear icon (Settings)
- [ ] Modal opens with same 3-tab layout
- [ ] Modal scrolls independently within `max-h-[80vh]`

**Step 4: Fix anything that looks off, commit if needed**

```bash
git add -A && git commit -m "fix: account page/modal integration tweaks"
```

---

## Task 6: Build, type-check, deploy

**Step 1: Full type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: clean (zero errors).

**Step 2: Build**

```bash
npm run build
```

Expected: ✓ Compiled successfully.

**Step 3: Deploy**

```bash
vercel --prod --yes
```

**Step 4: Smoke test production**

- `https://app.zuzu.codes/account` → centered card, 3 tabs
- Open AccountModal from sidebar gear → same UI
- Log in from a 3rd browser → oldest session auto-revoked (verify by checking Sessions tab)

**Step 5: Push**

```bash
git push
```
