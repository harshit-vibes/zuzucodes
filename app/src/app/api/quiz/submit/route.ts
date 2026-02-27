import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/neon';
import type { QuizForm } from '@/lib/data';

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

    const modules = await sql`
      SELECT quiz_form FROM modules WHERE id = ${moduleId}
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
    const totalQuestions = quizForm.questions.length;
    let correctCount = 0;
    const correctAnswers: Record<string, string> = {};

    for (const question of quizForm.questions) {
      correctAnswers[question.id] = question.correctOption;
      if (answers[question.id] === question.correctOption) correctCount++;
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= quizForm.passingScore;

    // Persist attempt — upsert so there is only one row per user+module
    if (userId) {
      try {
        await sql`
          INSERT INTO user_quiz_attempts (user_id, module_id, score_percent, passed, answers, attempted_at)
          VALUES (${userId}, ${moduleId}, ${score}, ${passed}, ${JSON.stringify(answers)}::JSONB, NOW())
          ON CONFLICT (user_id, module_id) DO UPDATE SET
            score_percent = EXCLUDED.score_percent,
            passed        = EXCLUDED.passed,
            answers       = EXCLUDED.answers,
            attempted_at  = EXCLUDED.attempted_at
        `;
      } catch (attemptError) {
        console.error('Error saving quiz attempt:', attemptError);
      }
    }

    return NextResponse.json({ score, passed, correctAnswers });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reset quiz progress (delete all attempts, allow retaking)
export async function DELETE(req: Request) {
  try {
    const { user } = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await req.json();

    if (!moduleId) {
      return NextResponse.json({ error: 'Missing moduleId' }, { status: 400 });
    }

    await sql`
      DELETE FROM user_quiz_attempts
      WHERE user_id = ${user.id} AND module_id = ${moduleId}
    `;

    return NextResponse.json({ success: true, message: 'Quiz progress reset. You can retake the quiz.' });
  } catch (error) {
    console.error('Error resetting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
