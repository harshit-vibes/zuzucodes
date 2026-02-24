import { NextResponse } from 'next/server';
import { getUsage } from '@/lib/judge0';

export async function GET() {
  try {
    const usage = await getUsage();
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ remaining: null, resetAt: null }, { status: 502 });
  }
}
