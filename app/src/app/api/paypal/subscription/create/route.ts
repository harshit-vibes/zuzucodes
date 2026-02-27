// src/app/api/paypal/subscription/create/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createSubscription, PLAN_ID } from '@/lib/paypal';

export async function POST() {
  const { user } = await auth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscription = await createSubscription(PLAN_ID);
    if (!subscription?.id) {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 502 });
    }
    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Failed to create subscription';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
