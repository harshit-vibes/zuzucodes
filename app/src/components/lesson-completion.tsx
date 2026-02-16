'use client';

import { useState } from 'react';

interface LessonCompletionProps {
  moduleId: string;
  sectionIndex: number;
  courseId: string;
  isInitiallyCompleted?: boolean;
  onComplete?: () => void;
}

export function LessonCompletion({
  moduleId,
  sectionIndex,
  courseId,
  isInitiallyCompleted = false,
  onComplete,
}: LessonCompletionProps) {
  const [isCompleted, setIsCompleted] = useState(isInitiallyCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime] = useState(Date.now());

  // Track time spent when marking complete
  const getTimeSpent = () => Math.round((Date.now() - startTime) / 1000);

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          sectionIndex,
          courseId,
          timeSpentSeconds: getTimeSpent(),
        }),
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
        body: JSON.stringify({
          moduleId,
          sectionIndex,
          courseId,
        }),
      });

      if (res.ok) {
        setIsCompleted(false);
      }
    } catch (error) {
      console.error('Error marking lesson incomplete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Completed</span>
        </div>
        <button
          onClick={handleMarkIncomplete}
          disabled={isLoading}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Mark as not done'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleMarkComplete}
      disabled={isLoading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Mark as Complete
        </>
      )}
    </button>
  );
}
