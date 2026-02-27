// src/app/api/paypal/client-token/route.ts
import { NextResponse } from 'next/server';
import { getClientToken } from '@/lib/paypal';

export async function GET() {
  try {
    const clientToken = await getClientToken();
    return NextResponse.json({ clientToken });
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Failed to get client token';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
