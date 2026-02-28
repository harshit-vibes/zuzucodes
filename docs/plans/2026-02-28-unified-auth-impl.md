# Unified Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth and unify all auth UI to use Neon's native `<AuthView>` component — replacing the hand-rolled `AuthDialog` state machine and deleting the now-redundant `EmailVerification` component.

**Architecture:** One prop addition to `NeonAuthUIProvider` (`social={{ providers: ['google'] }}`) makes Google appear everywhere. `AuthDialog` is simplified to a Dialog wrapping `<AuthView path={path} />` — no view state, no manual OTP handling. `AuthTrigger` passes `path` prop to control initial view. `EmailVerification` is deleted.

**Tech Stack:** Next.js App Router, `@neondatabase/auth/react` (`AuthView`, `NeonAuthUIProvider`), shadcn `Dialog`.

---

## Key Facts

- **`NeonAuthUIProvider`** is in `app/src/app/layout.tsx:97`. Current props: `authClient={authClient} redirectTo="/dashboard" emailOTP`. Adding `social={{ providers: ['google'] }}` makes Google button auto-appear in every `<AuthView>` across the app — no other changes needed for the page.
- **`AuthView`** from `@neondatabase/auth/react` is the all-in-one component. Accepts a `path` prop (`"sign-in"` | `"sign-up"` | `"email-otp"` etc). Handles sign-in/sign-up switching, OTP entry, Google OAuth, and post-auth redirect internally.
- **`AuthDialog`** is at `app/src/components/shared/auth-dialog.tsx`. Currently a state machine with `SignInForm`, `SignUpForm`, and `EmailVerification`. Nobody outside `auth-trigger.tsx` imports it — safe to rewrite entirely.
- **`AuthTrigger`** is at `app/src/components/shared/auth-trigger.tsx`. Only used in its own file (not imported anywhere in the app currently — but keep it correct for future use).
- **`EmailVerification`** is at `app/src/components/shared/email-verification.tsx`. Only used by `auth-dialog.tsx`. Delete it.
- **`DialogContent`** from shadcn has a built-in close button (`absolute right-4 top-4`). Use `p-0 overflow-hidden` so `AuthView` fills the dialog, and add `[&>button:last-child]:hidden` to hide the built-in close button (AuthView has its own flow controls).
- **Google OAuth env var:** Neon Auth handles Google OAuth credentials via the Neon dashboard — no env vars needed in `.env.local` for the OAuth itself.

---

## Task 1: Enable Google OAuth in NeonAuthUIProvider

**Files:**
- Modify: `app/src/app/layout.tsx`

**Step 1: Add `social` prop**

Find line 97 in `app/src/app/layout.tsx`:
```tsx
<NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP>
```

Replace with:
```tsx
<NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP social={{ providers: ['google'] }}>
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors. The `social` prop accepts `{ providers: string[] }` — `'google'` is valid.

**Step 3: Commit**

```bash
git add app/src/app/layout.tsx
git commit -m "feat: enable Google OAuth in NeonAuthUIProvider"
```

---

## Task 2: Rewrite `AuthDialog` to use `<AuthView>`

**Files:**
- Modify: `app/src/components/shared/auth-dialog.tsx`

**Step 1: Read the current file** (already known — it's a state machine with SignInForm/SignUpForm/EmailVerification, ~90 lines)

**Step 2: Replace the entire file with:**

```tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthView } from "@neondatabase/auth/react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path?: string;
}

export function AuthDialog({ open, onOpenChange, path = "sign-in" }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm overflow-hidden p-0 [&>button:last-child]:hidden">
        <AuthView path={path} />
      </DialogContent>
    </Dialog>
  );
}
```

Key points:
- `path` prop defaults to `"sign-in"` — controls which view `AuthView` starts on
- `p-0 overflow-hidden` — `AuthView` fills the dialog with no extra padding
- `[&>button:last-child]:hidden` — hides the shadcn default close button (AuthView manages its own flow)
- No `DialogHeader`, `DialogTitle`, or state — `AuthView` owns the entire UI

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add app/src/components/shared/auth-dialog.tsx
git commit -m "feat: rewrite AuthDialog using AuthView (remove state machine)"
```

---

## Task 3: Simplify `AuthTrigger`

**Files:**
- Modify: `app/src/components/shared/auth-trigger.tsx`

**Step 1: Replace the entire file with:**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./auth-dialog";

export function AuthTrigger() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [path, setPath] = useState("sign-in");

  const open = (p: string) => {
    setPath(p);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => open("sign-in")}>
          Sign in
        </Button>
        <Button onClick={() => open("sign-up")}>
          Sign up
        </Button>
      </div>

      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} path={path} />
    </>
  );
}
```

**Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add app/src/components/shared/auth-trigger.tsx
git commit -m "feat: simplify AuthTrigger to use path-based AuthDialog"
```

---

## Task 4: Delete `EmailVerification` component

**Files:**
- Delete: `app/src/components/shared/email-verification.tsx`

**Step 1: Verify no remaining imports**

```bash
grep -r "email-verification\|EmailVerification" app/src --include="*.tsx" --include="*.ts"
```

Expected: zero results (after Tasks 2 and 3 are done, `auth-dialog.tsx` no longer imports it).

**Step 2: Delete the file**

```bash
rm app/src/components/shared/email-verification.tsx
```

**Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: zero errors.

**Step 4: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete EmailVerification (absorbed by AuthView)"
```

---

## Task 5: Deploy and smoke test

**Step 1: Deploy**

```bash
cd app && vercel --prod --yes
```

**Step 2: Smoke test checklist**

Navigate to `https://app.zuzu.codes/auth/sign-in`:
- [ ] Google "Continue with Google" button visible
- [ ] Email OTP input still present
- [ ] Sign-in works via Google (redirects to `/dashboard`)
- [ ] Email OTP: enter email → receive code from Resend → enter → redirect to `/dashboard`

**Step 3: Push**

```bash
git push
```
