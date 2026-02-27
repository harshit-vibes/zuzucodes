import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import {
  getLesson,
  getModule,
  getCourseWithModules,
  getLessonsForCourse,
  getUserCode,
  getCourseConfidenceResponses,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function LessonOutroPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string; order: string }>;
}) {
  const { courseSlug, moduleSlug, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) notFound();

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

  if (!lessonData) notFound();

  const userCode = user ? await getUserCode(user.id, lessonData.id) : null;
  const isPassed = !!userCode?.passedAt;

  if (!isPassed) {
    redirect(`/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`);
  }

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/outro`;
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
      nextLocked={false}
      isAuthenticated={!!user}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20 w-fit">
          <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-success/70 font-mono">Challenge complete</span>
        </div>

        {lessonData.outroContent != null ? (
          <TemplateRenderer name="lesson-outro" content={lessonData.outroContent} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Well done completing <span className="text-foreground font-medium">{lessonData.title}</span>. Continue to the next lesson.
          </p>
        )}
      </div>
    </CoursePlayerShell>
  );
}
