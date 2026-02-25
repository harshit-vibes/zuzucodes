import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

export async function POST(req: Request) {
  const { user } = await auth();
  if (!user) {
    return new NextResponse(null, { status: 204 });
  }

  const { lessonId, code, testResults } = await req.json();

  if (!lessonId || typeof lessonId !== 'string' || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing lessonId or code' }, { status: 400 });
  }

  const resultsJson = testResults !== undefined ? testResults : null;

  // Compute allPassed server-side — don't trust the client for this
  const allPassed =
    Array.isArray(resultsJson) &&
    resultsJson.length > 0 &&
    (resultsJson as Array<{ pass: boolean }>).every(r => r.pass === true);

  const passedAt = allPassed ? new Date().toISOString() : null;

  if (resultsJson !== null) {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, last_test_results, passed_at, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, ${JSON.stringify(resultsJson)}, ${passedAt}, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        code              = EXCLUDED.code,
        last_test_results = EXCLUDED.last_test_results,
        passed_at         = CASE
                              WHEN user_code.passed_at IS NULL
                              THEN EXCLUDED.passed_at
                              ELSE user_code.passed_at
                            END,
        updated_at        = NOW()
    `;
  } else {
    await sql`
      INSERT INTO user_code (user_id, lesson_id, code, updated_at)
      VALUES (${user.id}, ${lessonId}, ${code}, NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        code       = EXCLUDED.code,
        updated_at = NOW()
    `;
  }

  return new NextResponse(null, { status: 204 });
}
