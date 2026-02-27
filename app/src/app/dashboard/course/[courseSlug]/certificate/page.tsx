import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getSectionCompletionStatus,
  getLessonsForCourse,
  getCourseConfidenceResponses,
  type ConfidenceForm,
  type SectionStatus,
} from '@/lib/data';
import { ReportCard } from '@/components/dashboard/report-card';
import { CourseCertificate } from '@/components/dashboard/course-certificate';

export default async function CertificatePage({
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

  if (isCompleted && course.confidence_form && confidenceResponses.completion === null) {
    redirect(`/dashboard/course/${courseSlug}/graduation`);
  }

  const bothSubmitted =
    confidenceResponses.onboarding !== null &&
    confidenceResponses.completion !== null;

  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const studentName = user?.email ?? 'Student';

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
          <span className="text-foreground/70">Certificate</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            Certificate
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
        </div>

        {!isCompleted ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Not yet earned</p>
            <p className="text-xs text-muted-foreground mb-4">Complete all lessons and quizzes to earn your certificate.</p>
            <Link
              href={`/dashboard/course/${courseSlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
            >
              Back to course →
            </Link>
          </div>
        ) : (
          <>
            {/* Report card — only when both surveys are done */}
            {bothSubmitted && course.confidence_form && (
              <ReportCard
                questions={(course.confidence_form as ConfidenceForm).questions}
                onboarding={confidenceResponses.onboarding!}
                completion={confidenceResponses.completion!}
              />
            )}

            {/* Certificate */}
            <CourseCertificate
              studentName={studentName}
              courseTitle={course.title}
              completionDate={completionDate}
            />
          </>
        )}

      </div>
    </div>
  );
}
