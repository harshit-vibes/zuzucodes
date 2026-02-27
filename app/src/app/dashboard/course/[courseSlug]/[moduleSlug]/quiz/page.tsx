import { getModule, isQuizCompleted, areAllLessonsCompleted, getCourseWithModules, getCourseConfidenceResponses, getLessonsForCourse, type QuizQuestion } from '@/lib/data';
import { auth } from '@/lib/auth/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { QuizPlayer } from './quiz-player';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import { buildCourseSequence } from '@/lib/course-sequence';

interface QuizPageProps {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { courseSlug, moduleSlug } = await params;
  const { user } = await auth();

  const [mod, course] = await Promise.all([
    getModule(moduleSlug),
    getCourseWithModules(courseSlug),
  ]);

  if (!mod || !mod.quiz_form || !course) {
    notFound();
  }

  const quizForm = mod.quiz_form;

  let isCompleted = false;
  let allLessonsCompleted = false;

  if (user) {
    const [quizCompleted, lessonsCompleted, confidenceResponses] = await Promise.all([
      isQuizCompleted(user.id, mod.id),
      areAllLessonsCompleted(user.id, mod.id),
      course.confidence_form
        ? getCourseConfidenceResponses(user.id, course.id)
        : Promise.resolve({ onboarding: null as Record<string, number> | null, completion: null as Record<string, number> | null }),
    ]);
    isCompleted = quizCompleted;
    allLessonsCompleted = lessonsCompleted;

    if (course.confidence_form && confidenceResponses.onboarding === null) {
      redirect(`/dashboard/course/${courseSlug}`);
    }
  }

  const isQuizLocked = !allLessonsCompleted && !isCompleted;

  // Strip correct answers before sending to client
  const clientQuestions = quizForm.questions.map((q: QuizQuestion) => ({
    id: q.id,
    statement: q.statement,
    options: q.options,
  }));

  // Build sequence for prev/next navigation
  const allLessonsMap = await getLessonsForCourse(course.modules.map((m) => m.id));

  const modIndex = course.modules.findIndex((m) => m.id === mod.id);
  const eyebrow = `Module ${String(modIndex + 1).padStart(2, '0')} · Quiz`;

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap);
  const currentHref = `/dashboard/course/${courseSlug}/${moduleSlug}/quiz`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <CoursePlayerShell
      eyebrow={eyebrow}
      title={quizForm.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={!isCompleted}
      isAuthenticated={!!user}
    >
      <div className="pb-10">
        <div className="container mx-auto px-6 py-10">
          {/* Quiz header */}
          <header className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="font-display text-xl font-semibold mb-1">
              {quizForm.title}
            </h1>
            <p className="text-xs text-muted-foreground/60 font-mono">
              {quizForm.questions.length} questions · {quizForm.passingScore}% to pass
            </p>
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
                  Complete all {mod.lesson_count} lesson{mod.lesson_count !== 1 ? 's' : ''} in this module to unlock the quiz.
                </p>

                <Link
                  href={`/dashboard/course/${courseSlug}/${moduleSlug}/lesson/1`}
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
              moduleId={mod.id}
              questions={clientQuestions}
              passingScore={quizForm.passingScore}
              courseId={courseSlug}
              isAlreadyPassed={isCompleted}
            />
          )}
        </div>
      </div>
    </CoursePlayerShell>
  );
}
