// src/app/api/paypal/webhook/route.ts
import { neon } from '@neondatabase/serverless';
import { verifyWebhookSignature } from '@/lib/paypal';

const sql = neon(process.env.DATABASE_URL!);

const STATUS_MAP: Record<string, string> = {
  'BILLING.SUBSCRIPTION.ACTIVATED': 'ACTIVE',
  'BILLING.SUBSCRIPTION.CANCELLED': 'CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED': 'SUSPENDED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED': 'SUSPENDED',
};

export async function POST(req: Request) {
  const body = await req.text();

  const isValid = await verifyWebhookSignature(req.headers, body);
  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event: { event_type: string; resource?: { id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const newStatus = STATUS_MAP[event.event_type];
  const subscriptionId = event.resource?.id;

  if (newStatus && subscriptionId) {
    await sql`
      UPDATE user_subscriptions
      SET status = ${newStatus}, updated_at = NOW()
      WHERE subscription_id = ${subscriptionId}
    `;
  }

  return new Response('OK', { status: 200 });
}
