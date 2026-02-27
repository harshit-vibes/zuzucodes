// src/lib/paypal.ts
const isLive = process.env.PAYPAL_MODE !== 'sandbox';

const BASE_URL = isLive
  ? process.env.PAYPAL_BASE_URL_LIVE!
  : process.env.PAYPAL_BASE_URL!;

const CLIENT_ID = isLive
  ? process.env.PAYPAL_CLIENT_ID_LIVE!
  : process.env.PAYPAL_CLIENT_ID!;

const SECRET = isLive
  ? process.env.PAYPAL_SECRET_LIVE!
  : process.env.PAYPAL_SECRET!;

export const PLAN_ID = isLive
  ? process.env.PAYPAL_PLAN_ID_LIVE!
  : process.env.PAYPAL_PLAN_ID!;

export const WEBHOOK_ID = isLive
  ? process.env.PAYPAL_WEBHOOK_ID_LIVE!
  : process.env.PAYPAL_WEBHOOK_ID!;

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const data = await res.json();
  return data.access_token as string;
}

export async function getClientToken(): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v1/identity/generate-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  const data = await res.json();
  return data.client_token as string;
}

export async function createSubscription(planId: string): Promise<{ id: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ plan_id: planId }),
    cache: 'no-store',
  });
  return res.json() as Promise<{ id: string }>;
}

export async function getSubscription(subscriptionId: string) {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  return res.json();
}

export async function verifyWebhookSignature(
  headers: Headers,
  body: string
): Promise<boolean> {
  // Skip verification outside production (dev testing + webhook simulator)
  if (process.env.NODE_ENV !== 'production') return true;

  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      }),
      cache: 'no-store',
    }
  );
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
