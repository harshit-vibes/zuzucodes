import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getLesson,
  getModule,
  getCourseWithModules,
  getLessonsForCourse,
  getCourseConfidenceResponses,
} from '@/lib/data';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';
import { TemplateRenderer } from '@/components/templates/template-renderer';

export default async function LessonIntroPage({
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

  const modIndex = course.modules.findIndex((m) => m.id === module.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Lesson ${position}`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}/intro`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  const contentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/lesson/${position}`;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={lessonData.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={false}
    >
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {lessonData.introContent != null ? (
          <TemplateRenderer name="lesson-intro" content={lessonData.introContent} />
        ) : null}

        {lessonData.problemSummary ? (
          <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
              Problem
            </p>
            <p className="text-sm text-foreground leading-relaxed">{lessonData.problemSummary}</p>

            {lessonData.problemConstraints.length > 0 && (
              <ul className="space-y-1">
                {lessonData.problemConstraints.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/40 font-mono shrink-0">—</span>
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {lessonData.problemHints.length > 0 && (
          <details className="rounded-xl border border-border/30 bg-card">
            <summary className="px-5 py-3 text-xs font-mono text-muted-foreground/50 cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              hints ({lessonData.problemHints.length})
            </summary>
            <div className="px-5 pb-4 space-y-2">
              {lessonData.problemHints.map((h, i) => (
                <p key={i} className="text-xs text-muted-foreground">{h}</p>
              ))}
            </div>
          </details>
        )}

        <Link
          href={contentHref}
          className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          Begin
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </CoursePlayerShell>
  );
}
