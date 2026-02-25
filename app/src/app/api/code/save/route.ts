import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return new NextResponse(null, { status: 204 });
  }

  const { lessonId, code, testResults } = await req.json();

  if (!lessonId || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing lessonId or code' }, { status: 400 });
  }

  const resultsJson = testResults !== undefined ? testResults : null;

  if (resultsJson !== null) {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, last_test_results, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, ${JSON.stringify(resultsJson)}, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET code = EXCLUDED.code,
                    last_test_results = EXCLUDED.last_test_results,
                    updated_at = NOW()
    `;
  } else {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
    `;
  }

  return new NextResponse(null, { status: 204 });
}
