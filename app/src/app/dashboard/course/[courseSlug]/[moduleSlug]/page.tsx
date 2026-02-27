import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getModule,
  getLessonsForCourse,
  getSectionCompletionStatus,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
import { TemplateRenderer } from '@/components/templates/template-renderer';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';

export default async function ModuleOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const { user } = await auth();

  // Fetch course + module in parallel (slugs known from params)
  const [course, mod] = await Promise.all([
    getCourseWithModules(courseSlug),
    getModule(moduleSlug),
  ]);

  if (!course || !mod) notFound();

  // Guard against cross-course URL mismatch
  const modIndex = course.modules.findIndex((m) => m.id === mod.id);
  if (modIndex === -1 || mod.course_id !== course.id) notFound();

  // Fetch lessons for ALL modules (needed for course sequence)
  const [allLessonsMap, completionStatus, confidenceResponses] = await Promise.all([
    getLessonsForCourse(course.modules.map((m) => m.id)),
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
    (l) => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed'
  ).length;
  const quizDone = mod.quiz_form
    ? (completionStatus[`${mod.id}:quiz`] ?? 'not-started') === 'completed'
    : false;
  const totalItems = lessons.length + (mod.quiz_form ? 1 : 0);
  const completedItems = lessonsDone + (quizDone ? 1 : 0);

  const isNotStarted = completedItems === 0;
  const isCompleted = totalItems > 0 && completedItems === totalItems;

  // First incomplete lesson or quiz
  let resumeHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/1`;
  for (const l of lessons) {
    if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] !== 'completed') {
      resumeHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${l.lesson_index + 1}`;
      break;
    }
  }
  if (lessonsDone === lessons.length && mod.quiz_form && !quizDone) {
    resumeHref = `/dashboard/course/${courseSlug}/${moduleSlug}/quiz`;
  }

  // Next module
  const nextMod = course.modules[modIndex + 1];
  const completedHref = nextMod
    ? `/dashboard/course/${courseSlug}/${nextMod.slug}`
    : `/dashboard/course/${courseSlug}`;

  const ctaLabel = isCompleted
    ? nextMod
      ? 'Next Module'
      : 'Back to Course'
    : isNotStarted
    ? 'Start Module'
    : 'Continue';
  const ctaHref = isCompleted ? completedHref : resumeHref;

  // Build sequence for prev/next navigation
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')}`;
  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}`;
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
      isAuthenticated={!!user}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Link
            href={`/dashboard/course/${courseSlug}`}
            className="hover:text-muted-foreground transition-colors"
          >
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-foreground/70">{mod.title}</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Module {String(modIndex + 1).padStart(2, '0')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mod.title}
          </h1>
          {mod.description ? (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {mod.description}
            </p>
          ) : null}
        </div>

        {/* Intro content (not started) */}
        {isNotStarted && mod.intro_content ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/50 mb-4">
              In this module
            </p>
            <TemplateRenderer name="module-intro" content={mod.intro_content} />
          </div>
        ) : null}

        {/* CTA */}
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {ctaLabel}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        {/* Lesson list */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} &middot; {completedItems} completed
          </h2>
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/20">
            {lessons.map((lesson) => {
              const done =
                (completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? 'not-started') === 'completed';
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${lesson.lesson_index + 1}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  {done ? (
                    <svg
                      className="w-4 h-4 text-success shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border/60 shrink-0" />
                  )}
                  <span
                    className={`text-sm flex-1 ${
                      done ? 'text-muted-foreground/60' : 'text-foreground'
                    }`}
                  >
                    {lesson.lesson_index + 1}. {lesson.title}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              );
            })}

            {mod.quiz_form ? (
              <Link
                href={`/dashboard/course/${courseSlug}/${moduleSlug}/quiz`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
              >
                {quizDone ? (
                  <svg
                    className="w-4 h-4 text-success shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-muted-foreground/40 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm flex-1 ${
                    quizDone ? 'text-muted-foreground/60' : 'text-foreground'
                  }`}
                >
                  Quiz — {mod.quiz_form.title}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>

      </div>
    </CoursePlayerShell>
  );
}
