'use client';

import { useState } from 'react';
import type { CourseForm } from '@/lib/data';

interface CourseFormPlayerProps {
  courseId: string;
  formType: 'onboarding' | 'completion';
  form: CourseForm;
  onComplete: () => void;
}

export function CourseFormPlayer({
  courseId,
  formType,
  form,
  onComplete,
}: CourseFormPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const question = form.questions[currentQuestion];
  const totalQuestions = form.questions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions;

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) setCurrentQuestion(q => q + 1);
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(q => q - 1);
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/course/form-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, formType, responses: answers }),
      });
      onComplete();
    } catch {
      // fail silently — still call onComplete so UX doesn't block
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          {formType === 'onboarding' ? 'Before you begin' : 'Course complete'}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{form.title}</h2>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/70 rounded-full transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums shrink-0">
          {currentQuestion + 1}/{totalQuestions}
        </span>
      </div>

      {/* Question */}
      <div>
        <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
          {question.statement}
        </p>
        <div className="space-y-2">
          {question.options.map(option => {
            const isSelected = answers[question.id] === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border/50 hover:border-primary/40 hover:bg-muted/30 text-foreground/80'
                }`}
              >
                <span className={`font-mono text-xs mr-3 ${isSelected ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  {option.id.toUpperCase()}
                </span>
                {option.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="px-3 h-8 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← prev
        </button>

        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={handleNext}
            disabled={!answers[question.id]}
            className="px-3 h-8 rounded bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="px-4 h-8 rounded bg-primary text-primary-foreground text-xs font-mono hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving···' : 'Submit →'}
          </button>
        )}
      </div>
    </div>
  );
}
