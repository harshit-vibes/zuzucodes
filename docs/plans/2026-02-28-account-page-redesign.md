# Account Page Redesign

**Date:** 2026-02-28
**Status:** Approved

---

## Goal

Rebuild the `/account` page and `AccountModal` with:
1. Centered standalone layout for the page
2. Three-tab structure shared by both page and modal
3. Correct flows for email/password change
4. Session log tab with 2-session enforcement

---

## Layout

`app/src/app/account/layout.tsx` — new file:
- `min-h-screen flex items-center justify-center bg-background px-4`
- Inner card: `max-w-xl w-full rounded-2xl border bg-card shadow-sm p-0`
- Sticky header inside card: `← Dashboard` back link + "Account" title + horizontal rule
- Body: renders `{children}` below header

The existing `app/src/app/account/page.tsx` removes its own container and passes directly to `AccountContent`.

---

## Tabs

The `AccountContent` component is rewritten to use shadcn `Tabs`. Three tabs:

### Tab 1 — Profile

- `UpdateNameCard` from `@neondatabase/auth/react` — inline name edit
- Subscription card (custom):
  - Status badge (Free / Active / Cancelled / Suspended / Expired)
  - Next billing date (if ACTIVE)
  - Trial end date (if applicable)
  - **Free users:** "Upgrade" button → opens existing `SubscribeModal`
  - **Paid users:** "Manage on PayPal" → `https://www.paypal.com/myaccount/autopay/` (new tab)

### Tab 2 — Security

- `ChangeEmailCard` from `@neondatabase/auth/react` — OTP-verified email change
- `ChangePasswordCard` from `@neondatabase/auth/react` — current → new password flow

Both are Neon Auth built-in components with correct flows. No custom form code needed.

### Tab 3 — Sessions

- Informational notice: "Maximum 2 active sessions allowed"
- `SessionsCard` from `@neondatabase/auth/react` — lists active sessions, revoke controls
- Danger zone separator
- `DeleteAccountCard` from `@neondatabase/auth/react` — account deletion with confirmation

---

## Session Limit Enforcement

**Server action:** `app/src/lib/actions/session-limit.ts`

```ts
export async function enforceSessionLimit(userId: string)
```

- Calls `authServer.api.listSessions({ headers: await headers() })`
- If count > 2, revokes oldest sessions (keeping 2 most recent by `createdAt` desc)
- Revoke via `authServer.api.revokeSession({ body: { sessionId }, headers: await headers() })`

**Called in:** `app/src/app/dashboard/layout.tsx` — after the `auth()` call, before rendering. Non-blocking if it fails (wrapped in try/catch).

**UI notice in Sessions tab:** "Maximum 2 active sessions allowed per account."

---

## Component Changes

| File | Change |
|------|--------|
| `app/src/app/account/layout.tsx` | **NEW** — centered card layout with back button |
| `app/src/app/account/page.tsx` | Simplify — remove container, pass through to `AccountContent` |
| `app/src/components/shared/account-content.tsx` | **Rewrite** — 3-tab layout using shadcn Tabs |
| `app/src/lib/actions/session-limit.ts` | **NEW** — `enforceSessionLimit()` server action |
| `app/src/app/dashboard/layout.tsx` | Add `enforceSessionLimit()` call after `auth()` |

`AccountModal` (`account-modal.tsx`) requires no changes — it already wraps `AccountContent`.

---

## Dependencies

All needed components are already exported from `@neondatabase/auth/react`:
- `UpdateNameCard`, `ChangeEmailCard`, `ChangePasswordCard`
- `SessionsCard`, `DeleteAccountCard`

shadcn `Tabs` component needs to be added if not already present.

---

## Out of Scope

- Password reset via email (separate auth flow, already handled by `/auth/[path]`)
- Avatar upload (not requested)
- Organization/team features
