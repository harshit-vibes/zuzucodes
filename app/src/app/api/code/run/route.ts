import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runCode } from '@/lib/judge0';
import { checkRateLimit, recordRun, RateLimitError } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { code?: string; stdin?: string };
  const { code, stdin } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    await checkRateLimit(session.user.id);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message, window: err.window, resetAt: err.resetAt.getTime() },
        { status: 429 },
      );
    }
    throw err;
  }

  try {
    const result = await runCode(code, stdin);
    await recordRun(session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
