// src/app/api/paypal/subscription/activate/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { auth } from '@/lib/auth/server';
import { getSubscription, PLAN_ID } from '@/lib/paypal';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { subscriptionId?: string };
  const { subscriptionId } = body;

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
  }

  const sub = await getSubscription(subscriptionId);
  if (!sub?.id) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  await sql`
    INSERT INTO user_subscriptions (user_id, subscription_id, plan_id, status)
    VALUES (${user.id}, ${subscriptionId}, ${sub.plan_id ?? PLAN_ID}, ${sub.status ?? 'APPROVAL_PENDING'})
    ON CONFLICT (subscription_id)
    DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
