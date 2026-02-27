# PayPal Subscription Integration — Design

## Context

zuzu.codes needs payment gating. Users should subscribe via PayPal before accessing lessons, quizzes, and code execution. The integration uses `@paypal/react-paypal-js` v9 (sdk-v6) with a subscription billing model.

---

## Credentials & Plans (already configured in `app/.env.local`)

| | Sandbox | Live |
|---|---|---|
| Base URL | `https://api-m.sandbox.paypal.com` | `https://api-m.paypal.com` |
| Client ID | `PAYPAL_CLIENT_ID` | `PAYPAL_CLIENT_ID_LIVE` |
| Secret | `PAYPAL_SECRET` | `PAYPAL_SECRET_LIVE` |
| Plan ID | `PAYPAL_PLAN_ID` (Pro, $19.99/mo) | `PAYPAL_PLAN_ID_LIVE` (monthly: $2.99 trial 1wk → $45/mo) |
| Webhook ID | `PAYPAL_WEBHOOK_ID` | `PAYPAL_WEBHOOK_ID_LIVE` |

Active env var switching: `PAYPAL_MODE=sandbox` → use sandbox credentials; anything else → use live.

---

## User States

| State | Condition | Experience |
|---|---|---|
| **Guest** | Not logged in | Landing page only, lesson player shows auth prompt |
| **Unpaid** | Logged in, no active subscription | Dashboard + course structure visible, lessons locked with paywall overlay |
| **Paid** | Logged in, `status = ACTIVE` | Full access: lessons, quizzes, code execution |

---

## DB Schema

```sql
-- migrations/007_user_subscriptions.sql
CREATE TABLE user_subscriptions (
  user_id              TEXT NOT NULL,
  subscription_id      TEXT UNIQUE NOT NULL,
  plan_id              TEXT NOT NULL,
  status               TEXT NOT NULL,  -- ACTIVE | CANCELLED | SUSPENDED | EXPIRED
  trial_end_at         TIMESTAMPTZ,
  next_billing_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON user_subscriptions (user_id);
```

---

## Subscription Flow

```
1. User clicks "Subscribe" on pricing card
2. SubscribeModal opens (shadcn Dialog)
3. PayPalProvider mounts → fetches GET /api/paypal/client-token
4. PayPalSubscriptionButton renders
5. User completes PayPal flow
6. onApprove({ subscriptionID }) fires
7. Client POST /api/paypal/subscription/activate { subscriptionId }
8. Server: GET PayPal /v1/billing/subscriptions/{id} → verify ACTIVE
9. Server: INSERT into user_subscriptions
10. Client: redirect to /dashboard
```

---

## Webhook → DB Sync

Registered at `https://zuzu.codes/api/paypal/webhook` (sandbox + live, same URL).

| PayPal Event | DB Action |
|---|---|
| `BILLING.SUBSCRIPTION.ACTIVATED` | `status = ACTIVE` |
| `BILLING.SUBSCRIPTION.CANCELLED` | `status = CANCELLED` |
| `BILLING.SUBSCRIPTION.SUSPENDED` | `status = SUSPENDED` |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | `status = SUSPENDED` |
| `PAYMENT.SALE.COMPLETED` | `updated_at = NOW()` |

Signature verification: call PayPal `POST /v1/notifications/verify-webhook-signature` using `PAYPAL_WEBHOOK_ID`. Skip verification in `NODE_ENV=development`.

---

## Access Control

No middleware — consistent with current app pattern. Each protected layout checks:

```typescript
const user = await auth();
if (!user) redirect('/auth/sign-in');

const sub = await getSubscriptionStatus(user.id); // React.cache() in data.ts
const isPaid = sub?.status === 'ACTIVE';
```

- Lesson page: `isPaid` false → renders `<PaywallOverlay>` instead of lesson content
- Dashboard: shows upgrade banner for unpaid users

---

## Files

| File | Action |
|---|---|
| `app/migrations/007_user_subscriptions.sql` | CREATE TABLE |
| `app/src/lib/paypal.ts` | PayPal REST helpers: `getAccessToken()`, `getClientToken()`, `getSubscription()`, `verifyWebhookSignature()` — switches sandbox/live based on `PAYPAL_MODE` |
| `app/src/lib/data.ts` | Add `getSubscriptionStatus(userId)` with `React.cache()` |
| `app/src/app/api/paypal/client-token/route.ts` | GET — returns client token for PayPalProvider |
| `app/src/app/api/paypal/subscription/activate/route.ts` | POST — verifies subscription with PayPal, writes to DB |
| `app/src/app/api/paypal/webhook/route.ts` | POST — verifies signature, updates DB status |
| `app/src/components/shared/subscribe-modal.tsx` | Dialog + PayPalProvider + PayPalSubscriptionButton |
| `app/src/components/shared/paywall-overlay.tsx` | Locked lesson overlay with subscribe CTA |
| `app/src/app/dashboard/layout.tsx` | Add subscription status check, pass `isPaid` down |
| `app/src/app/dashboard/course/[courseSlug]/[moduleSlug]/lesson/[order]/page.tsx` | Gate with paywall overlay if `!isPaid` |

---

## Environment Variable Strategy

```typescript
// src/lib/paypal.ts
const isLive = process.env.PAYPAL_MODE !== 'sandbox';
export const PAYPAL_BASE_URL = isLive
  ? process.env.PAYPAL_BASE_URL_LIVE!
  : process.env.PAYPAL_BASE_URL!;
export const CLIENT_ID = isLive
  ? process.env.PAYPAL_CLIENT_ID_LIVE!
  : process.env.PAYPAL_CLIENT_ID!;
// ... etc
```

---

## Verification

```bash
cd app
npm run dev
# 1. Open localhost:3000 — confirm pricing section shows Subscribe button
# 2. Click Subscribe — modal opens, PayPal button renders
# 3. Complete sandbox payment flow
# 4. Confirm redirect to /dashboard
# 5. Check DB: SELECT * FROM user_subscriptions;
# 6. Open a lesson — should be accessible (paid)
# 7. Use PayPal Webhook Simulator → fire BILLING.SUBSCRIPTION.CANCELLED
# 8. Check DB status updated to CANCELLED
# 9. Refresh lesson — should show PaywallOverlay
npm run build   # no type errors
npx tsc --noEmit
```
