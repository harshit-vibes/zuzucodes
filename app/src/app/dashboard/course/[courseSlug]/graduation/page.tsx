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
import { CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';

export default async function GraduationPage({
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

  const moduleIds = course.modules.map((m) => m.id);

  const [completionStatus, lessonsByModule, confidenceResponses] = await Promise.all([
    user?.id
      ? getSectionCompletionStatus(user.id, course.modules)
      : Promise.resolve({} as Record<string, SectionStatus>),
    getLessonsForCourse(moduleIds),
    user?.id
      ? getCourseConfidenceResponses(user.id, course.id)
      : Promise.resolve({ onboarding: null, completion: null }),
  ]);

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
  const isCompleted = totalItems > 0 && completedItems === totalItems;
  const completionSubmitted = confidenceResponses.completion !== null;

  return (
    <div className="flex-1 overflow-auto">
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
          <span className="text-foreground/70">Graduation</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Graduation
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
        </div>

        {/* Course outro */}
        {course.outro_content ? (
          <div className="rounded-xl border border-success/20 bg-success/5 p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-success/50 mb-4">
              Course complete
            </p>
            <TemplateRenderer name="course-outro" content={course.outro_content} />
          </div>
        ) : null}

        {/* Completion survey */}
        {course.confidence_form ? (
          !user ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to complete the post-course survey.</p>
            </div>
          ) : !isCompleted ? (
            <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Complete the course first</p>
              <p className="text-xs text-muted-foreground">Finish all lessons and quizzes to unlock the post-course survey.</p>
              <Link
                href={`/dashboard/course/${courseSlug}`}
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-mono text-primary hover:underline"
              >
                Back to course →
              </Link>
            </div>
          ) : completionSubmitted ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/5 border border-success/20">
              <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-success/70 font-mono">Post-course survey completed</span>
            </div>
          ) : (
            <CompletionFormWrapper courseId={course.id} form={course.confidence_form} />
          )
        ) : null}

      </div>
    </div>
  );
}
