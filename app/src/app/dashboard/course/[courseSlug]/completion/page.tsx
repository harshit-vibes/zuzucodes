import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { getCourseWithModules, getCourseConfidenceResponses } from '@/lib/data';
import { CompletionFormWrapper } from '@/components/dashboard/course-form-wrappers';

export default async function CourseCompletionPage({
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
  if (!course.confidence_form) redirect(`/dashboard/course/${courseSlug}`);

  const responses = user?.id
    ? await getCourseConfidenceResponses(user.id, course.id)
    : null;

  const alreadySubmitted = responses?.completion != null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-6">
          <a href={`/dashboard/course/${courseSlug}`} className="hover:text-muted-foreground transition-colors">
            {course.title}
          </a>
          <span>/</span>
          <span className="text-foreground/70">Post-Course Survey</span>
        </nav>

        {alreadySubmitted ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Already submitted</p>
            <p className="text-xs text-muted-foreground mt-1">You already completed the post-course survey.</p>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to complete the survey.</p>
          </div>
        ) : (
          <CompletionFormWrapper courseId={course.id} form={course.confidence_form} />
        )}
      </div>
    </div>
  );
}
