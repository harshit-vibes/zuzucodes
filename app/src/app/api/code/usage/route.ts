import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getUserUsage } from '@/lib/rate-limit';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getUserUsage(session.user.id);
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ perMin: null, per3hr: null, perDay: null, limits: null }, { status: 502 });
  }
}
