import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { runCode } from '@/lib/judge0';

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
    const result = await runCode(code, stdin, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
