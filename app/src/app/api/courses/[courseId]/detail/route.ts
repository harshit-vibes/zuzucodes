import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getCourseWithModules, getSectionCompletionStatus } from '@/lib/data';

interface ModuleDetail {
  id: string;
  title: string;
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
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

  const moduleDetails: ModuleDetail[] = course.modules.map((m) => {
    const lessonCompletion: boolean[] = [];
    for (let i = 0; i < m.section_count; i++) {
      lessonCompletion.push(completionStatus[`${m.id}:lesson-${i}`] ?? false);
    }
    const quizCompleted = completionStatus[`${m.id}:quiz`] ?? false;
    return {
      id: m.id,
      title: m.title,
      section_count: m.section_count,
      has_quiz: !!m.quiz_form,
      lessonCompletion,
      quizCompleted,
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
