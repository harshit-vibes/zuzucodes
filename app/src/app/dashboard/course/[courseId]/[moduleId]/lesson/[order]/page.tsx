import { getLesson, getModule, getLessonCount, getUserCode } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { CodeLessonLayout } from '@/components/lesson/code-lesson-layout';

interface LessonPageProps {
  params: Promise<{ courseId: string; moduleId: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, moduleId, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [lessonData, module, lessonCount] = await Promise.all([
    getLesson(moduleId, position),
    getModule(moduleId),
    getLessonCount(moduleId),
  ]);

  if (!lessonData || !module) {
    notFound();
  }

  const userCode = user ? await getUserCode(user.id, lessonData.id) : null;
  const isCompleted = !!userCode?.passedAt;

  return (
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      testCases={lessonData.testCases}
      entryPoint={lessonData.entryPoint}
      solutionCode={lessonData.solutionCode}
      savedCode={userCode?.code ?? null}
      lastTestResults={userCode?.lastTestResults ?? null}
      problem={lessonData.problem}
      lessonId={lessonData.id}
      courseId={courseId}
      moduleId={moduleId}
      moduleTitle={module.title}
      position={position}
      lessonCount={lessonCount}
      isAuthenticated={!!user}
      isCompleted={isCompleted}
    />
  );
}
