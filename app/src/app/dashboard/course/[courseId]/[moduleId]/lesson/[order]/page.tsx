import { getLesson, getModule, getLessonCount, isLessonCompleted, getUserCode } from '@/lib/data';
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

  const [isCompleted, savedCode] = await Promise.all([
    user ? isLessonCompleted(user.id, lessonData.id) : Promise.resolve(false),
    user ? getUserCode(user.id, lessonData.id) : Promise.resolve(null),
  ]);

  return (
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      content={lessonData.content}
      codeTemplate={lessonData.codeTemplate}
      testCases={lessonData.testCases}
      entryPoint={lessonData.entryPoint}
      solutionCode={lessonData.solutionCode}
      savedCode={savedCode}
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
