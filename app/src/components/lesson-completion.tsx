'use client';

import { useState } from 'react';

interface LessonCompletionProps {
  lessonId: string;
  courseId: string;
  isInitiallyCompleted?: boolean;
  onComplete?: () => void;
}

export function LessonCompletion({
  lessonId,
  courseId,
  isInitiallyCompleted = false,
  onComplete,
}: LessonCompletionProps) {
  const [isCompleted, setIsCompleted] = useState(isInitiallyCompleted);
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, courseId }),
      });
      if (res.ok) {
        setIsCompleted(true);
        onComplete?.();
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkIncomplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/progress/lesson', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, courseId }),
      });
      if (res.ok) setIsCompleted(false);
    } catch (error) {
      console.error('Error marking lesson incomplete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-success/15 ring-1 ring-success/40">
            <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-mono text-xs text-success/80 tracking-wide">lesson_complete</span>
        </div>
        <button
          onClick={handleMarkIncomplete}
          disabled={isLoading}
          className="font-mono text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-50"
        >
          {isLoading ? '···' : 'undo'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleMarkComplete}
      disabled={isLoading}
      className="flex items-center gap-2.5 group"
    >
      <div className="w-4 h-4 rounded border border-border/60 group-hover:border-primary/60 transition-colors flex items-center justify-center shrink-0">
        {isLoading && (
          <svg className="w-2.5 h-2.5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
      <span className="font-mono text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
        {isLoading ? 'saving···' : 'mark_complete()'}
      </span>
    </button>
  );
}
