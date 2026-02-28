'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

interface QuizOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  statement: string;
  options: QuizOption[];
}

interface QuizPlayerProps {
  moduleId: string;
  questions: Question[];
  passingScore: number;
  courseId: string;
  moduleSlug: string;
  isAlreadyPassed?: boolean;
}

type SelectedAnswers = Record<string, string>;

export function QuizPlayer({
  moduleId,
  questions,
  passingScore,
  courseId,
  moduleSlug,
  isAlreadyPassed = false,
}: QuizPlayerProps) {
  const router = useRouter();
  const posthog = usePostHog();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<SelectedAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPreviouslyPassed, setShowPreviouslyPassed] = useState(isAlreadyPassed);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: Record<string, string>;
  } | null>(null);

  const storageKey = `quiz-${moduleId}`;

  // Fire quiz_started on mount (only if not already passed)
  useEffect(() => {
    if (!isAlreadyPassed) {
      posthog?.capture('quiz_started', { course_slug: courseId, module_slug: moduleSlug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore saved state on mount
  useEffect(() => {
    if (showPreviouslyPassed) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { answers: savedAnswers, currentQuestion: savedQ } = JSON.parse(saved);
        if (savedAnswers) setAnswers(savedAnswers);
        if (typeof savedQ === 'number') setCurrentQuestion(savedQ);
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey, showPreviouslyPassed]);

  // Persist state on change (debounced to avoid thrashing on rapid answer changes)
  useEffect(() => {
    if (Object.keys(answers).length === 0 && currentQuestion === 0) return;
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentQuestion }));
    }, 300);
    return () => clearTimeout(timer);
  }, [answers, currentQuestion, storageKey]);

  const question = questions[currentQuestion];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleSelect = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: optionId,
    }));
  };

  const handleNext = () => {
    setCurrentQuestion(prev => Math.min(prev + 1, totalQuestions - 1));
  };

  const handlePrev = () => {
    setCurrentQuestion(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          answers,
          courseId,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.passed) {
        router.refresh();
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.5, y: 1 },
          colors: ['#ffffff', '#a3a3a3', '#22c55e', '#3b82f6'],
          disableForReducedMotion: true,
        });
        // Module completion burst — only on first-time pass
        if (!isAlreadyPassed) {
          setTimeout(() => {
            confetti({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.8 }, disableForReducedMotion: true });
            confetti({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.8 }, disableForReducedMotion: true });
          }, 300);
        }
      }

      // Clear saved state on successful submit
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = async () => {
    posthog?.capture('quiz_reset', { course_slug: courseId, module_slug: moduleSlug });
    setIsResetting(true);
    try {
      await fetch('/api/quiz/submit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
    } catch (error) {
      console.error('Error resetting quiz:', error);
    } finally {
      setIsResetting(false);
      setShowPreviouslyPassed(false);
      setResult(null);
      setAnswers({});
      setCurrentQuestion(0);
      localStorage.removeItem(storageKey);
    }
  };

  // Show previously passed state
  if (showPreviouslyPassed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-success/5 border border-success/20">
          <div>
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-success/20">
              <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="font-display text-2xl font-semibold mb-2">
              Quiz Already Passed!
            </h2>

            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              You have already passed this quiz. Would you like to retake it?
            </p>

            <div className="flex justify-center gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={handleRetake}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Retake Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show results
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Result card */}
        <div
          className={`rounded-2xl p-8 text-center ${
            result.passed
              ? 'bg-success/5 border border-success/20'
              : 'bg-destructive/5 border border-destructive/20'
          }`}
        >
          <div>
            {/* Icon */}
            <div
              className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
                result.passed ? 'bg-success/20' : 'bg-destructive/20'
              }`}
            >
              {result.passed ? (
                <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <h2 className="font-display text-2xl font-semibold mb-2">
              {result.passed ? 'Congratulations!' : 'Keep Learning'}
            </h2>

            {/* Score display */}
            <div className="inline-flex items-baseline gap-1 mb-4">
              <span className="font-display text-5xl font-bold">{result.score}</span>
              <span className="text-2xl text-muted-foreground">%</span>
            </div>

            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {result.passed
                ? "You've passed the quiz! Great job understanding the material."
                : `You need ${passingScore}% to pass. Review the lessons and try again.`}
            </p>

            <div className="flex justify-center gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Back to Dashboard
              </Link>
              {!result.passed && (
                <button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setCurrentQuestion(0);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              )}
              {result.passed && (
                <button
                  onClick={handleRetake}
                  disabled={isResetting}
                  className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {isResetting ? 'Resetting…' : 'Retake Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Answers review */}
        <div className="mt-10">
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full" />
            Review Answers
          </h3>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const userAnswer = answers[q.id];
              const correctAnswer = result.correctAnswers[q.id];
              const isCorrect = userAnswer === correctAnswer;
              const userOptionText = q.options.find(o => o.id === userAnswer)?.text;
              const correctOptionText = q.options.find(o => o.id === correctAnswer)?.text;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isCorrect
                      ? 'border-success/30 bg-success/5'
                      : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCorrect
                          ? 'bg-success/20 text-success'
                          : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-2">{q.statement}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                          Your answer: {userAnswer?.toUpperCase()} — {userOptionText}
                        </span>
                        {!isCorrect && (
                          <span className="text-success">
                            (Correct: {correctAnswer?.toUpperCase()} — {correctOptionText})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz questions
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress section */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="label-mono text-muted-foreground">
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span className="label-mono text-primary">
            {answeredCount} answered
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold leading-relaxed mb-8">
            {question.statement}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = answers[question.id] === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      }`}
                    >
                      {option.id.toUpperCase()}
                    </span>
                    <span className="flex-1 pt-1 text-sm leading-relaxed">
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <svg
            className="w-4 h-4 text-muted-foreground group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {/* Question dots */}
        <div className="hidden sm:flex items-center gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(i)}
              aria-label={`Go to question ${i + 1}`}
              aria-current={i === currentQuestion ? true : undefined}
              className={`w-2.5 h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                i === currentQuestion
                  ? 'bg-primary scale-125'
                  : answers[q.id]
                  ? 'bg-primary/50 hover:bg-primary/70'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors group"
          >
            Next
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg aria-hidden="true" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting…
              </>
            ) : (
              <>Submit Quiz</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
