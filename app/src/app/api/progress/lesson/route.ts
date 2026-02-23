import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

// Mark a lesson as complete
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, courseId } = await req.json();

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: 'Missing lessonId or courseId' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO user_lesson_progress (user_id, lesson_id, completed_at)
      VALUES (${user.id}, ${lessonId}, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET completed_at = NOW()
    `;

    const progressResult = await sql`
      SELECT * FROM get_batch_course_progress(${user.id}, ARRAY[${courseId}]::TEXT[])
    `;
    const progressPercent = progressResult[0]?.progress_percent || 0;

    return NextResponse.json({ success: true, completed: true, courseProgress: progressPercent });
  } catch (error) {
    console.error('Error in lesson complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Mark a lesson as incomplete (undo completion)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, courseId } = await req.json();

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: 'Missing lessonId or courseId' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM user_lesson_progress
      WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
    `;

    const progressResult = await sql`
      SELECT * FROM get_batch_course_progress(${user.id}, ARRAY[${courseId}]::TEXT[])
    `;
    const progressPercent = progressResult[0]?.progress_percent || 0;

    return NextResponse.json({ success: true, completed: false, courseProgress: progressPercent });
  } catch (error) {
    console.error('Error in lesson uncomplete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
