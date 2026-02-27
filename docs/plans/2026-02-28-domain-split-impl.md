# Domain Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split from a single domain to `zuzu.codes` (`web/` landing) and `app.zuzu.codes` (`app/` platform).

**Architecture:** `web/` stays on `zuzu.codes` and adds Next.js redirects for legacy app-route URLs. `app/` (currently on `www.zuzu.codes` as Vercel project `zuzu`) gets `app.zuzu.codes` added as a custom domain via CLI, with updated env vars. Neon Auth and PayPal webhook registrations are updated to reflect the new subdomain.

**Tech Stack:** Next.js 15 (both apps), Vercel CLI v50, Neon Auth, PayPal Developer portal

---

## Context

**Vercel project mapping (discovered):**
- `app/` → Vercel project `zuzu` (currently on `www.zuzu.codes`) — already linked via `app/.vercel/project.json`
- `web/` → Vercel project `web` (on `zuzu.codes`) — not yet linked locally

**What changes:**
- `app/` gets `app.zuzu.codes` added as a domain; env vars updated
- `web/` gets redirects in `next.config.ts` for legacy app-route bookmarks
- Neon Auth gets `app.zuzu.codes` added as an allowed origin
- PayPal webhook URL updated to `app.zuzu.codes`

**What does NOT change:**
- `web/` landing stays on `zuzu.codes` — no domain change for `web/`
- `www.zuzu.codes` can remain as an alias on the `zuzu` project (or be removed later)
- No code changes beyond the two files below

---

## Task 1: Add redirects in `web/next.config.ts`

**Purpose:** Anyone who has bookmarked `zuzu.codes/dashboard` or `/auth` gets 308-redirected to the correct subdomain. Google will update its index accordingly.

**Files:**
- Modify: `web/next.config.ts`

**Step 1: Replace the empty config**

`web/next.config.ts` currently has an empty config object. Replace the entire file with:

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

> `permanent: true` issues a 308 in Next.js 15, which browsers cache. Use `permanent: false` during local dev testing if you need to re-test the redirect without clearing cache.

**Step 2: Type-check**

```bash
cd /path/to/zuzucodes/web && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add web/next.config.ts
git commit -m "feat: redirect app routes to app.zuzu.codes"
```

---

## Task 2: Fix hardcoded fallback URL in `app/src/app/layout.tsx`

**Purpose:** `metadataBase` falls back to `https://zuzu.codes` if the env var is missing. The fallback should be `https://app.zuzu.codes` to keep OG and canonical metadata correct even without the env var.

**Files:**
- Modify: `app/src/app/layout.tsx` (~line 46)

**Step 1: Update the one fallback string**

Find:

```typescript
metadataBase: new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://zuzu.codes"
),
```

Replace with:

```typescript
metadataBase: new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://app.zuzu.codes"
),
```

**Step 2: Type-check**

```bash
cd /path/to/zuzucodes/app && npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit + push both tasks**

```bash
git add app/src/app/layout.tsx
git commit -m "fix: update metadataBase fallback to app.zuzu.codes"
git push
```

---

## Task 3: Link `web/` to its Vercel project

**Purpose:** `web/` has no `.vercel/project.json` yet. Link it to the `web` Vercel project so CLI commands work.

**Step 1: Run `vercel link` in `web/`**

```bash
cd /path/to/zuzucodes/web
vercel link
```

When prompted:
- **Set up and deploy?** → No (just linking, not deploying yet)
- **Which scope?** → `harshitvibes`
- **Link to existing project?** → Yes
- **Project name?** → `web`

**Step 2: Verify the link**

```bash
cat web/.vercel/project.json
```

Expected: contains `"projectName": "web"`.

---

## Task 4: Add `app.zuzu.codes` domain to the `zuzu` Vercel project

**Purpose:** `app/` is currently on `www.zuzu.codes`. Add `app.zuzu.codes` as an additional custom domain.

**Step 1: Add the domain via CLI**

```bash
cd /path/to/zuzucodes/app
vercel domains add app.zuzu.codes
```

Expected output: instructions to add a DNS record. It will say something like:

```
> Add the following record to your DNS provider:
  Type: CNAME
  Name: app
  Value: cname.vercel-dns.com
```

**Step 2: Add the DNS record**

Go to your DNS provider (the one managing `zuzu.codes` — check where the nameservers point; from `vercel domains ls` output, `zuzu.codes` uses Vercel nameservers).

If Vercel manages the DNS, the CLI may add the record automatically. If not, add manually:

| Type | Name | Value |
|------|------|-------|
| CNAME | app | cname.vercel-dns.com |

**Step 3: Verify the domain is recognised**

```bash
vercel domains inspect app.zuzu.codes
```

Wait until it shows `Valid Configuration`. DNS propagation can take a few minutes.

---

## Task 5: Update env vars on the `zuzu` Vercel project

**Purpose:** `NEXT_PUBLIC_APP_URL` must change from `https://www.zuzu.codes` to `https://app.zuzu.codes`. `NEXT_PUBLIC_ROOT_DOMAIN` must be `zuzu.codes` (without `www` or `app` prefix).

**Step 1: Remove old values**

```bash
cd /path/to/zuzucodes/app
vercel env rm NEXT_PUBLIC_APP_URL production --yes
vercel env rm NEXT_PUBLIC_ROOT_DOMAIN production --yes
```

**Step 2: Add new values**

```bash
echo "https://app.zuzu.codes" | vercel env add NEXT_PUBLIC_APP_URL production
echo "zuzu.codes" | vercel env add NEXT_PUBLIC_ROOT_DOMAIN production
```

**Step 3: Confirm**

```bash
vercel env ls production
```

Expected: `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ROOT_DOMAIN` show updated values.

---

## Task 6: Redeploy `app/` and `web/` to production

**Purpose:** Pick up the updated env vars (app) and the new redirects (web).

**Step 1: Redeploy `app/`**

```bash
cd /path/to/zuzucodes/app
vercel --prod
```

Wait for `✓ Production: https://app.zuzu.codes` in the output.

**Step 2: Redeploy `web/`**

```bash
cd /path/to/zuzucodes/web
vercel --prod
```

Wait for `✓ Production: https://zuzu.codes` in the output.

**Step 3: Quick sanity check**

```bash
# Should 308-redirect to https://app.zuzu.codes/dashboard
curl -I https://zuzu.codes/dashboard

# Should return 200 (login page or dashboard)
curl -I https://app.zuzu.codes/dashboard
```

Expected for first: `HTTP/2 308` with `location: https://app.zuzu.codes/dashboard`.
Expected for second: `HTTP/2 200` or `HTTP/2 307` (auth redirect to /auth/sign-in).

---

## Task 7: Update Neon Auth trusted domains via Neon API ✅ DONE

**Purpose:** Neon Auth validates the origin on auth API calls. `app.zuzu.codes` must be in the trusted domains list or sign-in will fail with a CORS/403 error.

> **Note:** `neonctl` v2.21.0 has no native command for managing Neon Auth trusted domains. Use the Neon REST API directly with the OAuth token from neonctl credentials. This task has already been executed — `app.zuzu.codes` is live in the trusted domains list.

**Neon project details:**
- Org: `org-autumn-breeze-01504295` (Harshit)
- Project ID: `late-sky-89059162` (zuzu-codes)

**Commands (for re-running or auditing):**

```bash
ACCESS_TOKEN=$(cat ~/.config/neonctl/credentials.json | python3 -c \
  "import sys,json; print(json.load(sys.stdin)['access_token'])")

# List current trusted domains
curl -s "https://console.neon.tech/api/v2/projects/late-sky-89059162/auth/domains" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Add a domain (auth_provider must be "stack")
curl -s -X POST "https://console.neon.tech/api/v2/projects/late-sky-89059162/auth/domains" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "https://app.zuzu.codes", "auth_provider": "stack"}'
# Expected: empty body, 201 Created

# Delete a domain when decommissioning
curl -s -X DELETE "https://console.neon.tech/api/v2/projects/late-sky-89059162/auth/domains/https%3A%2F%2Fwww.zuzu.codes" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Current state:** `app.zuzu.codes` is confirmed in the trusted domains list. No action needed.

**Post-deploy verification:** After Task 6, open incognito → `https://app.zuzu.codes/auth/sign-in` → enter email → confirm OTP arrives → sign in successfully.

---

## Task 8: Update PayPal webhook URL

**Purpose:** PayPal sends `BILLING.SUBSCRIPTION.*` events to a registered webhook URL. It must be updated from the old domain to `app.zuzu.codes`.

**Step 1: Use the PayPal MCP to find the current webhook**

```
use PayPal MCP: list webhooks (live environment)
```

Note the current webhook URL and its `id`.

**Step 2: Update the webhook URL**

```
use PayPal MCP: update webhook <id>
  url: https://app.zuzu.codes/api/paypal/webhook
```

Or use [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → your Live app → Webhooks → Edit.

**Step 3: Check if Webhook ID changed**

If PayPal assigns a new webhook `id`, update the env var:

```bash
cd /path/to/zuzucodes/app
vercel env rm PAYPAL_WEBHOOK_ID_LIVE production --yes
echo "<new-id>" | vercel env add PAYPAL_WEBHOOK_ID_LIVE production
vercel --prod
```

**Step 4: Send a test event**

In the PayPal webhook UI, click "Send Test" → `BILLING.SUBSCRIPTION.ACTIVATED`. Confirm you get a `200` response.

---

## Task 9: Final smoke test

**Purpose:** Verify the full user journey works end-to-end on the new subdomain, in production, in incognito.

**Run these checks in order (incognito window):**

| URL | Expected |
|-----|----------|
| `https://zuzu.codes` | Landing page loads normally |
| `https://zuzu.codes/dashboard` | 308 → `https://app.zuzu.codes/dashboard` |
| `https://zuzu.codes/auth/sign-in` | 308 → `https://app.zuzu.codes/auth/sign-in` |
| `https://app.zuzu.codes/dashboard` | Redirects to sign-in (if not authenticated) |
| `https://app.zuzu.codes/auth/sign-in` | OTP sign-in works end-to-end |
| `https://app.zuzu.codes/dashboard` | Dashboard loads after sign-in |
| View source / OG tags on app page | `metadataBase` resolves to `https://app.zuzu.codes` |

**Verify redirect header:**

```bash
curl -sI https://zuzu.codes/dashboard | grep -i location
# Expected: location: https://app.zuzu.codes/dashboard
```
