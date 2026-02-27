import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type SectionStatus,
} from '@/lib/data';
import { TemplateRenderer } from '@/components/templates/template-renderer';
import { OnboardingFormWrapper } from '@/components/dashboard/course-form-wrappers';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [{ user }, course] = await Promise.all([
    auth(),
    getCourseWithModules(courseSlug),
  ]);
  if (!course) notFound();

  const moduleIds = course.modules.map(m => m.id);

  const [completionStatus, lessonsByModule, confidenceResponses] = await Promise.all([
    user?.id
      ? getSectionCompletionStatus(user.id, course.modules)
      : Promise.resolve({} as Record<string, SectionStatus>),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

  const onboardingSubmitted = confidenceResponses.onboarding !== null;

  // Compute overall progress
  let totalItems = 0;
  let completedItems = 0;
  for (const mod of course.modules) {
    const lessons = lessonsByModule[mod.id] ?? [];
    totalItems += lessons.length + (mod.quiz_form ? 1 : 0);
    for (const l of lessons) {
      if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed') completedItems++;
    }
    if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] === 'completed') completedItems++;
  }
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Compute resume href — first incomplete lesson or quiz
  let resumeHref = course.modules[0]
    ? `/dashboard/course/${courseSlug}/${course.modules[0].slug}/lesson/1`
    : `/dashboard`;
  outer: for (const mod of course.modules) {
    const lessons = lessonsByModule[mod.id] ?? [];
    for (const l of lessons) {
      if (completionStatus[`${mod.id}:lesson-${l.lesson_index}`] !== 'completed') {
        resumeHref = `/dashboard/course/${courseSlug}/${mod.slug}/lesson/${l.lesson_index + 1}`;
        break outer;
      }
    }
    if (mod.quiz_form && completionStatus[`${mod.id}:quiz`] !== 'completed') {
      resumeHref = `/dashboard/course/${courseSlug}/${mod.slug}/quiz`;
      break;
    }
  }

  const hasStarted = completedItems > 0;

  // Build sequence for prev/next navigation
  const steps = buildCourseSequence(courseSlug, course.modules, lessonsByModule);
  const currentHref = `/dashboard/course/${courseSlug}`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  // Next is locked if the course has a confidence form and onboarding hasn't been submitted
  const nextLocked = course.confidence_form ? !onboardingSubmitted : false;

  return (
    <CoursePlayerShell
      eyebrow={course.tag ? course.tag.toUpperCase() : 'COURSE'}
      title={course.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={nextLocked}
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ─── Header ─────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            {course.title}
          </h1>
          {!course.intro_content && course.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          ) : null}
        </div>

        {/* ─── Course intro ───────────────────────────────────────── */}
        {course.intro_content ? (
          <div className="rounded-xl border border-border/30 bg-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-4">
              About this course
            </p>
            <TemplateRenderer name="course-intro" content={course.intro_content} />
          </div>
        ) : null}

        {/* ─── Onboarding survey ──────────────────────────────── */}
        {user && course.confidence_form && (
          onboardingSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Pre-course survey completed</span>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-mono font-semibold text-warning uppercase tracking-wider">
                  Required before starting
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Complete this survey before accessing any lessons.
              </p>
              <OnboardingFormWrapper courseId={course.id} form={course.confidence_form} />
            </div>
          )
        )}

        {/* ─── Progress CTA ───────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {hasStarted ? 'In progress' : 'Not started'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedItems} / {totalItems} items completed
              </p>
            </div>
            <span className="font-mono text-lg font-semibold text-primary tabular-nums">
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <Link
            href={resumeHref}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {hasStarted ? 'Continue learning' : 'Start course'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* ─── Outcomes ───────────────────────────────────────────── */}
        {course.outcomes && course.outcomes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">What you&apos;ll learn</h2>
            <ul className={`grid gap-2 ${course.outcomes.length >= 4 ? 'sm:grid-cols-2' : ''}`}>
              {course.outcomes.map((outcome, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Curriculum ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Curriculum</h2>
          <div className="space-y-3">
            {course.modules.map((mod, modIdx) => {
              const lessons = lessonsByModule[mod.id] ?? [];
              const lessonsDone = lessons.filter(
                l => completionStatus[`${mod.id}:lesson-${l.lesson_index}`] === 'completed'
              ).length;
              const quizDone = mod.quiz_form ? (completionStatus[`${mod.id}:quiz`] ?? 'not-started') === 'completed' : null;
              const modTotal = lessons.length + (mod.quiz_form ? 1 : 0);
              const modDone = lessonsDone + (quizDone ? 1 : 0);

              const modStatus: 'complete' | 'partial' | 'empty' =
                modTotal > 0 && modDone === modTotal
                  ? 'complete'
                  : modDone > 0
                  ? 'partial'
                  : 'empty';

              return (
                <div key={mod.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  {/* Module header — links to module overview page */}
                  <Link
                    href={`/dashboard/course/${courseSlug}/${mod.slug}`}
                    className="flex items-center justify-between px-4 py-3 border-b border-border/30 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ModuleStatusIcon status={modStatus} />
                      <span className="text-sm font-medium text-foreground truncate">
                        <span className="text-muted-foreground/50 mr-2 font-mono text-[11px]">
                          {String(modIdx + 1).padStart(2, '0')}
                        </span>
                        {mod.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[11px] font-mono text-muted-foreground/60">
                        {modDone}/{modTotal}
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  {/* Lesson list */}
                  <div className="divide-y divide-border/20">
                    {lessons.map((lesson, lessonIdx) => {
                      const done = (completionStatus[`${mod.id}:lesson-${lesson.lesson_index}`] ?? 'not-started') === 'completed';
                      const href = `/dashboard/course/${courseSlug}/${mod.slug}/lesson/${lesson.lesson_index + 1}`;
                      return (
                        <Link
                          key={lesson.id}
                          href={href}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group"
                        >
                          <LessonStatusDot done={done} />
                          <span className={`text-sm flex-1 truncate transition-colors group-hover:text-foreground ${done ? 'text-muted-foreground/60' : 'text-foreground'}`}>
                            {lessonIdx + 1}. {lesson.title}
                          </span>
                          <svg className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })}

                    {/* Quiz row */}
                    {mod.quiz_form && (
                      <Link
                        href={`/dashboard/course/${courseSlug}/${mod.slug}/quiz`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group"
                      >
                        <QuizStatusDot done={quizDone ?? false} />
                        <span className={`text-sm flex-1 truncate transition-colors group-hover:text-foreground ${quizDone ? 'text-muted-foreground/60' : 'text-foreground'}`}>
                          Quiz
                        </span>
                        <svg className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </CoursePlayerShell>
  );
}

// ─── Small helper components ─────────────────────────────────────────────────

function ModuleStatusIcon({ status }: { status: 'complete' | 'partial' | 'empty' }) {
  if (status === 'complete') {
    return (
      <div className="w-4 h-4 rounded-full bg-success/15 ring-1 ring-success/40 flex items-center justify-center shrink-0">
        <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-primary/10 shrink-0" />
    );
  }
  return <div className="w-4 h-4 rounded-full border border-border/60 shrink-0" />;
}

function LessonStatusDot({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return <div className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" />;
}

function QuizStatusDot({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
