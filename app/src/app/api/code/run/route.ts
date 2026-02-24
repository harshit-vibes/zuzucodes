import { NextResponse } from 'next/server';
import { submitCode } from '@/lib/judge0';

export async function POST(req: Request) {
  const { code, testCode } = await req.json();

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const source = testCode ? `${code}\n\n${testCode}` : code;

  try {
    const result = await submitCode(source);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message ?? 'Execution failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
