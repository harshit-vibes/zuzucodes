'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseFormPlayer } from './course-form';
import type { CourseForm } from '@/lib/data';

export function OnboardingFormWrapper({
  courseId,
  form,
}: {
  courseId: string;
  form: CourseForm;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">Thanks! Ready to start?</p>
        <button
          onClick={() => router.refresh()}
          className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Start course →
        </button>
      </div>
    );
  }

  return (
    <CourseFormPlayer
      courseId={courseId}
      formType="onboarding"
      form={form}
      onComplete={() => setDone(true)}
    />
  );
}

export function CompletionFormWrapper({
  courseId,
  form,
}: {
  courseId: string;
  form: CourseForm;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 text-center">
        <p className="text-sm font-medium text-foreground mb-1">Course complete!</p>
        <p className="text-xs text-muted-foreground">Thanks for your feedback.</p>
      </div>
    );
  }

  return (
    <CourseFormPlayer
      courseId={courseId}
      formType="completion"
      form={form}
      onComplete={() => setDone(true)}
    />
  );
}
