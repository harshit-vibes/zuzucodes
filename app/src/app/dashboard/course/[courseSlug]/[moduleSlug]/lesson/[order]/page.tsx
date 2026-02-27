import { getLesson, getModule, getUserCode, getCourseWithModules, getLessonsForCourse, getCourseConfidenceResponses, getSubscriptionStatus } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import { CodeLessonLayout } from '@/components/lesson/code-lesson-layout';
import { PaywallOverlay } from '@/components/shared/paywall-overlay';
import { PLAN_ID } from '@/lib/paypal';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';

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

  const moduleIds = course.modules.map((m) => m.id);

  const [lessonData, allLessonsMap, confidenceResponses] = await Promise.all([
    getLesson(module.id, position),
    getLessonsForCourse(moduleIds),
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

  const subscription = user ? await getSubscriptionStatus(user.id) : null;
  const isPaid = subscription?.status === 'ACTIVE';

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;
  const outroHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/outro`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={lessonData.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={!isCompleted}
      scrollable={false}
      isAuthenticated={!!user}
    >
      {!isPaid && <PaywallOverlay planId={PLAN_ID} />}
      <CodeLessonLayout
        lessonTitle={lessonData.title}
        content={lessonData.content}
        outroHref={outroHref}
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
        isAuthenticated={!!user}
        isCompleted={isCompleted}
      />
    </CoursePlayerShell>
  );
}
