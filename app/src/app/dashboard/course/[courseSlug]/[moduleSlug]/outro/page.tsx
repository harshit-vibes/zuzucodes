import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function ModuleOutroPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const { user } = await auth();

  const [course, mod] = await Promise.all([
    getCourseWithModules(courseSlug),
    getModule(moduleSlug),
  ]);
  if (!course || !mod) notFound();

  const modIndex = course.modules.findIndex((m) => m.id === mod.id);
  if (modIndex === -1 || mod.course_id !== course.id) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [allLessonsMap, completionStatus, confidenceResponses] = await Promise.all([
    getLessonsForCourse(moduleIds),
    user?.id
      ? getSectionCompletionStatus(user.id, [mod])
      : Promise.resolve({} as Record<string, SectionStatus>),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  if (course.confidence_form && user?.id && confidenceResponses.onboarding === null) {
    redirect(`/dashboard/course/${courseSlug}`);
  }

  const lessons = allLessonsMap[mod.id] ?? [];
  const lessonsDone = lessons.filter(
    (l) => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed',
  ).length;
  const quizDone = mod.quiz_form
    ? completionStatus[`${mod.id}:quiz`] === 'completed'
    : true;
  const isCompleted = lessonsDone === lessons.length && quizDone;

  if (!isCompleted) {
    redirect(`/dashboard/course/${courseSlug}/${moduleSlug}`);
  }

  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/outro`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={mod.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={false}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20 w-fit">
          <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-success/70 font-mono">Module complete</span>
        </div>

        {mod.outro_content ? (
          <TemplateRenderer name="module-outro" content={mod.outro_content} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;ve completed <span className="text-foreground font-medium">{mod.title}</span>.
          </p>
        )}
      </div>
    </CoursePlayerShell>
  );
}
