import { getLesson, getModule, getLessonCount, getUserCode, getCourseWithModules, getCourseConfidenceResponses } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import { CodeLessonLayout } from '@/components/lesson/code-lesson-layout';

interface LessonPageProps {
  params: Promise<{ courseSlug: string; moduleSlug: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, moduleSlug, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [module, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);
  if (!module || !course) notFound();

  const [lessonData, lessonCount, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonCount(module.id),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  if (!lessonData) {
    notFound();
  }

  const userCode = user ? await getUserCode(user.id, lessonData.id) : null;
  const isCompleted = !!userCode?.passedAt;

  return (
    <CodeLessonLayout
      lessonTitle={lessonData.title}
      introContent={lessonData.introContent}
      content={lessonData.content}
      outroContent={lessonData.outroContent}
      codeTemplate={lessonData.codeTemplate}
      testCases={lessonData.testCases}
      entryPoint={lessonData.entryPoint}
      solutionCode={lessonData.solutionCode}
      savedCode={userCode?.code ?? null}
      lastTestResults={userCode?.lastTestResults ?? null}
      problemSummary={lessonData.problemSummary}
      problemConstraints={lessonData.problemConstraints}
      problemHints={lessonData.problemHints}
      lessonId={lessonData.id}
      courseId={courseSlug}
      moduleId={moduleSlug}
      moduleTitle={module.title}
      position={position}
      lessonCount={lessonCount}
      isAuthenticated={!!user}
      isCompleted={isCompleted}
    />
  );
}
