import { getCourseWithModules, getBatchModuleCompletionStatus, getSectionCompletionStatus } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/breadcrumb';

interface CourseOverviewProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseOverviewPage({ params }: CourseOverviewProps) {
  const { courseId } = await params;
  const { user } = await auth();

  const course = await getCourseWithModules(courseId);

  if (!course) {
    notFound();
  }

  // Check lesson completion for all modules in a single batch query
  const moduleIds = course.modules.map(m => m.id);
  const moduleLessonStatus = user
    ? await getBatchModuleCompletionStatus(user.id, moduleIds)
    : {};

  // Fetch per-section completion for checkmarks
  const sectionCompletion = user
    ? await getSectionCompletionStatus(user.id, course.modules)
    : {};

  // Calculate total lessons
  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.section_count,
    0
  );

  return (
    <div className="min-h-screen">
      {/* Course header */}
      <div className="relative border-b border-border/50">
        <div className="relative container mx-auto px-6 py-8">
          <Breadcrumb
            items={[
              { label: 'Courses', href: '/dashboard' },
              { label: course.title },
            ]}
          />

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Thumbnail */}
            {course.thumbnail_url && (
              <div className="relative w-full lg:w-80 h-48 lg:h-52 flex-shrink-0 rounded-xl overflow-hidden shadow-lg shadow-black/5">
                <Image
                  src={course.thumbnail_url}
                  alt={course.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 320px"
                  priority
                />
              </div>
            )}

            {/* Course info */}
            <div className="flex-1 py-2">
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {course.tag && (
                  <span className="label-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    {course.tag}
                  </span>
                )}
                <span className="label-mono px-2.5 py-1 rounded-md bg-accent/10 text-accent">
                  {totalLessons} lessons
                </span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-4">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-4">
                  {course.description}
                </p>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Course content */}
      <div className="container mx-auto px-6 py-10">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Course Content
          </h2>

          {course.modules.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground">No modules available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => {
                const hasQuiz = module.quiz_form !== null;
                const lessonItems = module.contentItems.filter(item => item.type === 'lesson');

                return (
                  <div
                    key={module.id}
                    className="group rounded-xl border border-border/60 bg-card overflow-hidden transition-all hover:border-border hover:shadow-sm"
                  >
                    {/* Module header */}
                    <div className="px-5 py-4 bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold mt-0.5">
                            {moduleIndex + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {module.title}
                            </h3>
                            {module.description && (
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="label-mono text-muted-foreground">
                            {lessonItems.length} {lessonItems.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                          {hasQuiz && (
                            <span className="label-mono text-warning-foreground bg-warning/10 px-1.5 py-0.5 rounded">
                              quiz
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Module contents */}
                    <div className="divide-y divide-border/50">
                      {/* Lessons — from contentItems with real titles */}
                      {lessonItems.map((item) => {
                        const completionKey = `${module.id}:lesson-${item.index}`;
                        const isLessonCompleted = sectionCompletion[completionKey] ?? false;

                        return (
                          <Link
                            key={`${module.id}-lesson-${item.index}`}
                            href={`/dashboard/course/${courseId}/${module.id}/lesson/${item.index + 1}`}
                            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30 group/item"
                          >
                            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                              isLessonCompleted
                                ? 'bg-success/20 text-success'
                                : 'bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary'
                            }`}>
                              {isLessonCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                item.index + 1
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate">
                                {item.title}
                              </span>
                            </div>
                            <svg
                              className="w-4 h-4 text-muted-foreground group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      })}

                      {/* Quiz */}
                      {hasQuiz && (() => {
                        const status = moduleLessonStatus[module.id];
                        const isQuizLocked = user && !status?.allLessonsCompleted && !status?.quizCompleted;
                        const isQuizCompleted = status?.quizCompleted;

                        return (
                          <Link
                            href={`/dashboard/course/${courseId}/${module.id}/quiz`}
                            className={`flex items-center gap-4 px-5 py-3.5 transition-colors group/item ${
                              isQuizLocked
                                ? 'bg-muted/30 opacity-60'
                                : isQuizCompleted
                                ? 'bg-success/5 hover:bg-success/10'
                                : 'bg-warning/[0.02] hover:bg-warning/5'
                            }`}
                          >
                            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              isQuizLocked
                                ? 'bg-muted text-muted-foreground'
                                : isQuizCompleted
                                ? 'bg-success/20 text-success'
                                : 'bg-warning/20 text-warning-foreground'
                            }`}>
                              {isQuizLocked ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : isQuizCompleted ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </span>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Module Quiz
                              </span>
                              {isQuizLocked && (
                                <span className="text-xs text-muted-foreground">
                                  Complete lessons first
                                </span>
                              )}
                              {isQuizCompleted && (
                                <span className="label-mono text-success bg-success/10 px-1.5 py-0.5 rounded text-xs">
                                  passed
                                </span>
                              )}
                            </div>
                            <svg
                              className={`w-4 h-4 transition-all ${
                                isQuizLocked
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground group-hover/item:text-warning-foreground group-hover/item:translate-x-0.5'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
