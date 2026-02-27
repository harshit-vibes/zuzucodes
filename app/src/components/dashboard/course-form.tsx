'use client';

import { useState } from 'react';
import type { ConfidenceForm } from '@/lib/data';

interface LikertFormPlayerProps {
  courseId: string;
  formType: 'onboarding' | 'completion';
  form: ConfidenceForm;
  onComplete: () => void;
}

export function LikertFormPlayer({
  courseId,
  formType,
  form,
  onComplete,
}: LikertFormPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAnswered = Object.keys(answers).length === form.questions.length;

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
      onComplete(); // fail open — don't block UX
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
          {formType === 'onboarding' ? 'Before you begin' : "Now that you're done"}
        </p>
        <h2 className="text-base font-semibold text-foreground">{form.title}</h2>
      </div>

      {/* All questions */}
      <div className="space-y-6">
        {form.questions.map((q, i) => {
          const selected = answers[q.id];
          return (
            <div key={q.id}>
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                <span className="font-mono text-[10px] text-muted-foreground/40 mr-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {q.statement}
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    className={`flex-1 h-9 rounded-lg border-2 text-xs font-mono transition-all ${
                      selected === val
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground/40 font-mono">Not confident</span>
                <span className="text-[10px] text-muted-foreground/40 font-mono">Very confident</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
        className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving···' : 'Submit →'}
      </button>
    </div>
  );
}
