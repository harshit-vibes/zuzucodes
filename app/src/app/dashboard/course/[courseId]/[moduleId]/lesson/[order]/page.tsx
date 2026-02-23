import { getLesson, getModule, getLessonCount, isLessonCompleted } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/breadcrumb';
import { Markdown } from '@/components/markdown';
import { LessonCompletion } from '@/components/lesson-completion';

interface LessonPageProps {
  params: Promise<{ courseId: string; moduleId: string; order: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseId, moduleId, order } = await params;
  const { user } = await auth();

  const position = parseInt(order, 10);
  if (isNaN(position) || position < 1) {
    notFound();
  }

  const [lessonData, module, lessonCount] = await Promise.all([
    getLesson(moduleId, position),
    getModule(moduleId),
    getLessonCount(moduleId),
  ]);

  if (!lessonData || !module) {
    notFound();
  }

  const isCompleted = user
    ? await isLessonCompleted(user.id, lessonData.id)
    : false;

  const hasNext = position < lessonCount;
  const hasPrev = position > 1;
  const progress = (position / lessonCount) * 100;

  return (
    <div className="min-h-screen">
      {/* Compact header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: module.title },
            ]}
          />
        </div>
      </div>

      {/* Main content area with article styling */}
      <article className="container mx-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Lesson header */}
          <header className="mb-10">
            {/* Progress indicator */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="label-mono text-muted-foreground flex-shrink-0">
                {position}/{lessonCount}
              </span>
            </div>

            {/* Lesson title */}
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {lessonData.title}
            </h1>
          </header>

          {/* Content */}
          <div className="prose-container">
            {lessonData.content ? (
              <Markdown content={lessonData.content} />
            ) : (
              <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No content available yet.</p>
              </div>
            )}
          </div>

          {/* Completion section */}
          {user && (
            <div className="mt-12 pt-8 border-t border-border/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-medium text-foreground mb-1">
                    {isCompleted ? 'Lesson Complete!' : 'Finished this lesson?'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isCompleted
                      ? 'Great progress! Continue to the next lesson.'
                      : 'Mark it complete to track your progress.'}
                  </p>
                </div>
                <LessonCompletion
                  lessonId={lessonData.id}
                  courseId={courseId}
                  isInitiallyCompleted={isCompleted}
                />
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Sticky bottom navigation */}
      <nav className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {hasPrev ? (
              <Link
                href={`/dashboard/course/${courseId}/${moduleId}/lesson/${position - 1}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors group"
              >
                <svg
                  className="w-4 h-4 text-muted-foreground group-hover:-translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
              </Link>
            ) : (
              <div />
            )}

            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: lessonCount }, (_, i) => (
                <Link
                  key={i}
                  href={`/dashboard/course/${courseId}/${moduleId}/lesson/${i + 1}`}
                  className={`block rounded-full transition-all ${
                    i + 1 === position
                      ? 'bg-primary w-6 h-2'
                      : i + 1 < position
                      ? 'bg-primary/40 w-2 h-2 hover:bg-primary/60'
                      : 'bg-muted-foreground/30 w-2 h-2 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            {hasNext ? (
              <Link
                href={`/dashboard/course/${courseId}/${moduleId}/lesson/${position + 1}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors group"
              >
                <span>Next</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href={`/dashboard/course/${courseId}/${moduleId}/quiz`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors group"
              >
                <span>Take Quiz</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
