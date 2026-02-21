import { getModule, isSectionCompleted, areAllLessonsCompleted, type QuizQuestion } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/breadcrumb';
import { QuizPlayer } from './quiz-player';

interface QuizPageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { courseId, moduleId } = await params;
  const { user } = await auth();

  const module = await getModule(moduleId);

  if (!module || !module.quiz_form) {
    notFound();
  }

  const quizForm = module.quiz_form;

  // Parallelize independent completion checks
  let isCompleted = false;
  let allLessonsCompleted = false;

  if (user) {
    [isCompleted, allLessonsCompleted] = await Promise.all([
      isSectionCompleted(user.id, moduleId, null),
      areAllLessonsCompleted(user.id, moduleId),
    ]);
  }

  const isQuizLocked = !allLessonsCompleted && !isCompleted;

  // Strip correct answers before sending to client
  const clientQuestions = quizForm.questions.map((q: QuizQuestion) => ({
    id: q.id,
    statement: q.statement,
    options: q.options,
  }));

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: module.title },
              { label: 'Quiz' },
            ]}
          />
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        {/* Quiz header */}
        <header className="max-w-2xl mx-auto text-center mb-10">
          {/* Module badge */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="label-mono text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              {module.title}
            </span>
            {isCompleted && (
              <span className="label-mono text-success bg-success/10 px-2.5 py-1 rounded-md">
                Passed
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-semibold mb-3">
            {quizForm.title}
          </h1>

          {/* Quiz meta */}
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizForm.questions.length} questions
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quizForm.passingScore}% to pass
            </span>
          </div>
        </header>

        {/* Quiz locked state */}
        {isQuizLocked ? (
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center">
              {/* Lock icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold mb-2">Quiz Locked</h2>
              <p className="text-muted-foreground mb-6">
                Complete all {module.section_count} lesson{module.section_count !== 1 ? 's' : ''} in this module to unlock the quiz.
              </p>

              <Link
                href={`/dashboard/course/${courseId}/${moduleId}/lesson/1`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Start Lessons
              </Link>
            </div>
          </div>
        ) : (
          /* Quiz player */
          <QuizPlayer
            moduleId={moduleId}
            questions={clientQuestions}
            passingScore={quizForm.passingScore}
            courseId={courseId}
            isAlreadyPassed={isCompleted}
          />
        )}
      </div>
    </div>
  );
}
