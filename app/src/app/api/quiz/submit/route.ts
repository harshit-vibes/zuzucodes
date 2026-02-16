import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';
import type { QuizForm } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { user } = await auth();
    const userId = user?.id;

    const { moduleId, answers, courseId } = await req.json();

    if (!moduleId || !answers) {
      return NextResponse.json(
        { error: 'Missing moduleId or answers' },
        { status: 400 }
      );
    }

    // Get quiz_form from module
    const modules = await sql`
      SELECT quiz_form
      FROM modules
      WHERE id = ${moduleId}
    `;

    if (modules.length === 0 || !modules[0].quiz_form) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quizForm = modules[0].quiz_form as QuizForm;

    // Validate answers
    const questionIds = new Set(quizForm.questions.map(q => q.id));
    const validOptions = ['a', 'b', 'c', 'd'];

    for (const [qId, answer] of Object.entries(answers)) {
      if (!questionIds.has(qId)) {
        return NextResponse.json({ error: `Unknown question ID: ${qId}` }, { status: 400 });
      }
      if (typeof answer !== 'string' || !validOptions.includes(answer)) {
        return NextResponse.json({ error: `Invalid answer for ${qId}` }, { status: 400 });
      }
    }

    // Calculate score
    let totalQuestions = quizForm.questions.length;
    let correctCount = 0;
    const correctAnswers: Record<string, string> = {};

    for (const question of quizForm.questions) {
      correctAnswers[question.id] = question.correctOption;
      if (answers[question.id] === question.correctOption) {
        correctCount++;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= quizForm.passingScore;

    // If user is logged in, persist the attempt (use UPSERT to allow retaking)
    if (userId) {
      try {
        await sql`
          INSERT INTO user_progress (user_id, module_id, section_index, completed_at, score_percent, passed, answers)
          VALUES (${userId}, ${moduleId}, NULL, NOW(), ${score}, ${passed}, ${JSON.stringify(answers)}::JSONB)
          ON CONFLICT (user_id, module_id, section_index)
          DO UPDATE SET
            completed_at = NOW(),
            score_percent = ${score},
            passed = ${passed},
            answers = ${JSON.stringify(answers)}::JSONB
        `;
      } catch (attemptError) {
        console.error('Error saving quiz attempt:', attemptError);
      }
    }

    return NextResponse.json({
      score,
      passed,
      correctAnswers,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reset quiz progress (allow retaking)
export async function DELETE(req: Request) {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await req.json();

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Missing moduleId' },
        { status: 400 }
      );
    }

    // Delete all quiz attempt rows for this module (section_index IS NULL, score_percent IS NOT NULL)
    await sql`
      DELETE FROM user_progress
      WHERE user_id = ${user.id}
        AND module_id = ${moduleId}
        AND section_index IS NULL
        AND score_percent IS NOT NULL
    `;

    return NextResponse.json({
      success: true,
      message: 'Quiz progress reset. You can retake the quiz.',
    });
  } catch (error) {
    console.error('Error resetting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
