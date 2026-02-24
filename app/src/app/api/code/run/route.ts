import { NextResponse } from 'next/server';
import { runCode } from '@/lib/judge0';

export async function POST(req: Request) {
  const body = await req.json() as { code?: string; stdin?: string };
  const { code, stdin } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const result = await runCode(code, stdin);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
