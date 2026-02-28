import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runTests, TestCase } from '@/lib/judge0';

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
    const result = await runTests(code, testCases, entryPoint, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Test execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
