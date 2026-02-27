# Domain Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the monorepo from a single domain (`zuzu.codes` for both apps) to `zuzu.codes` (`web/` landing) and `app.zuzu.codes` (`app/` platform).

**Architecture:** `web/` stays on `zuzu.codes` and adds Next.js redirects for any legacy app-route URLs. `app/` moves to a new Vercel project at `app.zuzu.codes` with updated env vars. Neon Auth and PayPal webhook registrations are updated to reflect the new subdomain.

**Tech Stack:** Next.js 15 (both apps), Vercel (separate projects), Neon Auth, PayPal Developer portal

---

## Context

Current state:
- `web/` and `app/` are both under `zuzu.codes`
- `web/` has no links to `/dashboard` or `/auth` — only external WhatsApp links
- `app/` uses `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ROOT_DOMAIN` for self-referencing URLs
- Neon Auth handles auth for `app/` only
- PayPal webhook points at the current `app/` deployment URL

After split:
- `zuzu.codes` → `web/` landing page (eventually Framer)
- `app.zuzu.codes` → `app/` platform
- Legacy bookmarks to `zuzu.codes/dashboard` → 301 redirect to `app.zuzu.codes/dashboard`

---

## Task 1: Add redirects in `web/next.config.ts`

**Purpose:** Anyone who has bookmarked `zuzu.codes/dashboard` or `/auth` gets redirected to the correct subdomain after the split. This also handles SEO — Google will update its index via 301.

**Files:**
- Modify: `web/next.config.ts`

**Step 1: Replace the empty config**

Open `web/next.config.ts`. It currently contains an empty config object. Replace with:

```typescript
import type { NextConfig } from "next";

const APP_URL =
  process.env.NODE_ENV === "production"
    ? "https://app.zuzu.codes"
    : "http://localhost:3001";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/:path*",
        destination: `${APP_URL}/dashboard/:path*`,
        permanent: true,
      },
      {
        source: "/auth/:path*",
        destination: `${APP_URL}/auth/:path*`,
        permanent: true,
      },
      {
        source: "/account/:path*",
        destination: `${APP_URL}/account/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

> **Note on `permanent: true`:** This issues a 308 (permanent redirect) in Next.js 15, which browsers cache. In development, use `permanent: false` if you need to test the redirect repeatedly — or clear browser cache. For production, permanent is correct.

**Step 2: Verify TypeScript**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Smoke test locally**

```bash
# Terminal 1: web on port 3000
cd web && npm run dev

# Terminal 2: app on port 3001 (just to have something to redirect to)
cd app && npm run dev -- -p 3001
```

Visit `http://localhost:3000/dashboard` → should redirect to `http://localhost:3001/dashboard`.

**Step 4: Commit**

```bash
cd web
git add next.config.ts
git commit -m "feat: redirect app routes to app.zuzu.codes"
```

---

## Task 2: Fix hardcoded fallback URL in `app/src/app/layout.tsx`

**Purpose:** `metadataBase` falls back to `https://zuzu.codes` if `NEXT_PUBLIC_APP_URL` is not set. After the split, this fallback should be `https://app.zuzu.codes`. This affects OG image URLs and canonical metadata.

**Files:**
- Modify: `app/src/app/layout.tsx` (line ~46)

**Step 1: Update the fallback**

Find this line in `app/src/app/layout.tsx`:

```typescript
metadataBase: new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://zuzu.codes"
),
```

Change the fallback:

```typescript
metadataBase: new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://app.zuzu.codes"
),
```

**Step 2: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
cd app
git add src/app/layout.tsx
git commit -m "fix: update metadataBase fallback to app.zuzu.codes"
```

---

## Task 3: Push both changes

```bash
git push
```

Verify both commits are on remote before proceeding to Vercel setup.

---

## Task 4: Vercel — configure `app/` project for `app.zuzu.codes`

**Purpose:** Point the `app/` Next.js project to `app.zuzu.codes` in Vercel, with the correct environment variables.

This is a manual step in the Vercel dashboard. Follow these exactly:

**Step 1: Open the `app/` Vercel project**

Go to [vercel.com](https://vercel.com) → your team → find the project that deploys `app/`.

**Step 2: Add the `app.zuzu.codes` domain**

Settings → Domains → Add → enter `app.zuzu.codes`.

Follow the DNS instructions (usually a CNAME from `app` → `cname.vercel-dns.com`). Apply in your DNS provider.

**Step 3: Update environment variables**

Settings → Environment Variables. Update or add (for **Production** environment):

| Variable | New value |
|----------|-----------|
| `NEXT_PUBLIC_APP_URL` | `https://app.zuzu.codes` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `zuzu.codes` |

> `NEXT_PUBLIC_ROOT_DOMAIN` is used in `access-denied/page.tsx` to link back to the landing page — it's already correct conceptually, just needs the value without `https://`.

**Step 4: Redeploy**

Deployments → find the latest → Redeploy (without cache) to pick up new env vars.

**Step 5: Verify deployment**

Visit `https://app.zuzu.codes/dashboard` — should load the platform (redirects to login if not authenticated). No 404, no SSL error.

---

## Task 5: Vercel — remove `app/` routes from `web/` project (if applicable)

**Purpose:** Ensure `zuzu.codes` does NOT serve the Next.js app routes after the split. If `zuzu.codes` was previously routing `/dashboard` to the `app/` Vercel project via path rewrites or fallback config, remove those.

**Step 1: Check `web/` Vercel project for rewrites**

In Vercel dashboard → `web/` project → Settings → check for any path rewrites pointing to the old `app/` project.

Also check if a `vercel.json` exists in `web/`:

```bash
ls web/vercel.json
```

If it exists, read it and remove any rewrite rules targeting `/dashboard`, `/auth`, or `/account`.

**Step 2: Redeploy `web/`**

After any changes, redeploy `web/` on Vercel.

**Step 3: Verify redirect chain**

Visit `https://zuzu.codes/dashboard` in an **incognito window** (to avoid cached redirects).

Expected: 308 redirect → `https://app.zuzu.codes/dashboard` → login page.

---

## Task 6: Update Neon Auth allowed origins

**Purpose:** Neon Auth validates the `Origin` header on auth requests. After the split, `app.zuzu.codes` must be an allowed origin or auth will fail.

**Step 1: Open Neon Auth dashboard**

Go to [console.neon.tech](https://console.neon.tech) → your project → Auth.

**Step 2: Add `app.zuzu.codes` to allowed origins**

Look for "Allowed Origins" or "Redirect URIs" configuration. Add:

```
https://app.zuzu.codes
```

Keep `https://zuzu.codes` as well if it was there (for the transition period).

**Step 3: Verify auth works on the new subdomain**

Visit `https://app.zuzu.codes/auth/sign-in`. Enter an email, submit. Confirm the OTP email arrives and you can sign in successfully.

---

## Task 7: Update PayPal webhook URL

**Purpose:** PayPal sends subscription events (BILLING.SUBSCRIPTION.ACTIVATED, etc.) to a registered webhook URL. It's currently pointing at the old domain. After the split, it must point at `app.zuzu.codes`.

**Step 1: Open PayPal Developer dashboard**

Go to [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → your app (Live) → Webhooks.

**Step 2: Update the webhook URL**

Find the webhook with URL `https://zuzu.codes/api/paypal/webhook` (or similar).

Edit it → change URL to:

```
https://app.zuzu.codes/api/paypal/webhook
```

Save.

**Step 3: Note the new Webhook ID**

PayPal may assign a new `WEBHOOK_ID` when you edit the webhook. If it does:

Update `PAYPAL_WEBHOOK_ID` (or `PAYPAL_WEBHOOK_ID_LIVE`) in the `app/` Vercel project environment variables. Redeploy.

**Step 4: Send a test event**

In the PayPal webhook UI, click "Send Test" → select `BILLING.SUBSCRIPTION.ACTIVATED`. Confirm you see a 200 response from `app.zuzu.codes/api/paypal/webhook`.

---

## Task 8: Final smoke test

**Purpose:** Verify the full user journey works end-to-end on the new subdomain.

**Checklist:**

| Flow | Expected |
|------|----------|
| `https://zuzu.codes` | Landing page loads |
| `https://zuzu.codes/dashboard` | 308 → `https://app.zuzu.codes/dashboard` → login |
| `https://zuzu.codes/auth/sign-in` | 308 → `https://app.zuzu.codes/auth/sign-in` |
| `https://app.zuzu.codes` | Redirects to `/dashboard` or landing (correct app behavior) |
| `https://app.zuzu.codes/auth/sign-in` | Sign-in page loads, OTP works |
| `https://app.zuzu.codes/dashboard` | Dashboard loads after sign-in |
| OG meta on app pages | `metadataBase` is `https://app.zuzu.codes` |
| PayPal subscription flow | Webhook receives events at `app.zuzu.codes` |

Run in incognito to avoid stale browser caches.
