import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';

// Mark a lesson section as complete
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId, sectionIndex, courseId } = await req.json();

    if (!moduleId || sectionIndex === undefined || !courseId) {
      return NextResponse.json(
        { error: 'Missing moduleId, sectionIndex, or courseId' },
        { status: 400 }
      );
    }

    // Use UPSERT to atomically insert or update (fixes race condition)
    await sql`
      INSERT INTO user_progress (user_id, module_id, section_index, completed_at)
      VALUES (${user.id}, ${moduleId}, ${sectionIndex}, NOW())
      ON CONFLICT (user_id, module_id, section_index)
      DO UPDATE SET completed_at = NOW()
    `;

    // Get updated course progress
    const progressResult = await sql`
      SELECT * FROM get_batch_course_progress(${user.id}, ARRAY[${courseId}]::TEXT[])
    `;
    const progressPercent = progressResult[0]?.progress_percent || 0;

    return NextResponse.json({
      success: true,
      completed: true,
      courseProgress: progressPercent,
    });
  } catch (error) {
    console.error('Error in lesson complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark a lesson section as incomplete (undo completion)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId, sectionIndex, courseId } = await req.json();

    if (!moduleId || sectionIndex === undefined || !courseId) {
      return NextResponse.json(
        { error: 'Missing moduleId, sectionIndex, or courseId' },
        { status: 400 }
      );
    }

    // Delete the lesson progress row (only lesson rows, not quiz attempts)
    await sql`
      DELETE FROM user_progress
      WHERE user_id = ${user.id}
        AND module_id = ${moduleId}
        AND section_index = ${sectionIndex}
        AND score_percent IS NULL
    `;

    // Get updated progress
    const progressResult = await sql`
      SELECT * FROM get_batch_course_progress(${user.id}, ARRAY[${courseId}]::TEXT[])
    `;
    const progressPercent = progressResult[0]?.progress_percent || 0;

    return NextResponse.json({
      success: true,
      completed: false,
      courseProgress: progressPercent,
    });
  } catch (error) {
    console.error('Error in lesson uncomplete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
