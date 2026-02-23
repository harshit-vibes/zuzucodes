import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getCourseWithModules, getSectionCompletionStatus } from '@/lib/data';
import { sql } from '@/lib/neon';

interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;
  lesson_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
  lessonTitles: string[];
}

interface DetailResponse {
  modules: ModuleDetail[];
  resumeHref: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const { user } = await auth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const course = await getCourseWithModules(courseId);
  if (!course) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const completionStatus = await getSectionCompletionStatus(user.id, course.modules);

  // Fetch real lesson titles for all modules in one query
  const lessonRows = await sql`
    SELECT module_id, lesson_index, title
    FROM lessons
    WHERE module_id = ANY(${course.modules.map((m) => m.id)})
    ORDER BY module_id, lesson_index ASC
  `;

  const lessonTitlesByModule = new Map<string, string[]>();
  for (const row of lessonRows as any[]) {
    if (!lessonTitlesByModule.has(row.module_id)) {
      lessonTitlesByModule.set(row.module_id, []);
    }
    lessonTitlesByModule.get(row.module_id)!.push(row.title);
  }

  const moduleDetails: ModuleDetail[] = course.modules.map((m) => {
    const lessonCompletion: boolean[] = [];
    for (let i = 0; i < m.lesson_count; i++) {
      lessonCompletion.push(completionStatus[`${m.id}:lesson-${i}`] ?? false);
    }
    const quizCompleted = completionStatus[`${m.id}:quiz`] ?? false;

    const lessonTitles = lessonTitlesByModule.get(m.id)
      ?? Array.from({ length: m.lesson_count }, (_, i) => `Lesson ${i + 1}`);

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      lesson_count: m.lesson_count,
      has_quiz: !!m.quiz_form,
      lessonCompletion,
      quizCompleted,
      lessonTitles,
    };
  });

  // Resolve resumeHref: first incomplete lesson/quiz, or first lesson if all done
  let resumeHref = `/dashboard/course/${courseId}/${course.modules[0]?.id}/lesson/1`;

  outer: for (const mod of moduleDetails) {
    // Check each lesson
    for (let i = 0; i < mod.lessonCompletion.length; i++) {
      if (!mod.lessonCompletion[i]) {
        resumeHref = `/dashboard/course/${courseId}/${mod.id}/lesson/${i + 1}`;
        break outer;
      }
    }
    // All lessons done — check quiz
    if (mod.has_quiz && !mod.quizCompleted) {
      resumeHref = `/dashboard/course/${courseId}/${mod.id}/quiz`;
      break outer;
    }
  }

  const response: DetailResponse = {
    modules: moduleDetails,
    resumeHref,
  };

  return NextResponse.json(response);
}
