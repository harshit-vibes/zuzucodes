import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runTests, TestCase } from '@/lib/judge0';
import { checkRateLimit, recordRun, RateLimitError } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { code?: string; testCases?: TestCase[]; entryPoint?: string };
  const { code, testCases, entryPoint } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return NextResponse.json({ error: 'Missing testCases' }, { status: 400 });
  }
  if (!entryPoint || typeof entryPoint !== 'string') {
    return NextResponse.json({ error: 'Missing entryPoint' }, { status: 400 });
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
    const result = await runTests(code, testCases, entryPoint);
    await recordRun(session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Test execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
