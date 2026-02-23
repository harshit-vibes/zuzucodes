'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';
import { titleCase, cn } from '@/lib/utils';
import type { Course, CourseProgress } from '@/lib/data';

interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;
  lesson_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
  lessonTitles: string[];
}

interface DetailData {
  modules: ModuleDetail[];
  resumeHref: string;
}

interface CourseOverviewDialogProps {
  course: Course;
  courseProgress: CourseProgress | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseOverviewDialog({
  course,
  courseProgress,
  open,
  onOpenChange,
}: CourseOverviewDialogProps) {
  const router = useRouter();
  const [data, setData] = useState<DetailData | null>(null);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    fetch(`/api/courses/${course.id}/detail`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: DetailData) => setData(json))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err);
        }
      });

    return () => {
      controller.abort();
      setData(null);
    };
  }, [open, course.id]);

  // When dialog is open and data hasn't arrived yet, show loading state
  const loading = open && data === null;

  const status = courseProgress?.status ?? 'not_started';
  const progressValue = courseProgress?.progress ?? 0;

  const ctaLabel =
    status === 'completed' ? 'Review →' : status === 'in_progress' ? 'Continue →' : 'Start →';

  const handleCta = () => {
    if (!data) return;
    router.push(data.resumeHref);
    onOpenChange(false);
  };

  const hasOutcomes = (course.outcomes?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 gap-0">

        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          {course.tag && (
            <span className="inline-block mb-2 w-fit px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {titleCase(course.tag)}
            </span>
          )}
          <DialogTitle className="text-xl font-semibold leading-snug">
            {course.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Course overview — modules and progress
          </DialogDescription>
          {course.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {course.description}
            </p>
          )}
          {progressValue > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <Progress value={progressValue} className="flex-1 h-1.5" />
              <span className="text-xs font-medium text-primary tabular-nums">
                {progressValue}%
              </span>
              <StatusBadge status={status} />
            </div>
          )}
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* What you'll learn */}
          {hasOutcomes && (
            <section>
              <p className="label-mono text-muted-foreground mb-3">What you&apos;ll learn</p>
              <div className={cn('grid gap-x-4 gap-y-2', (course.outcomes?.length ?? 0) >= 4 ? 'grid-cols-2' : 'grid-cols-1')}>
                {(course.outcomes ?? []).map((outcome, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </span>
                    <span className="text-sm text-foreground/90 leading-snug">{outcome}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Divider before curriculum */}
          {hasOutcomes && (
            <hr className="border-border/50" />
          )}

          {/* Curriculum */}
          {loading && <ModuleSkeletons />}

          {!loading && data && (
            <section className="space-y-3">
              <p className="label-mono text-muted-foreground">Curriculum</p>
              {data.modules.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} />
              ))}
            </section>
          )}
        </div>

        {/* ── Footer CTA ──────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border/50 flex-shrink-0">
          <button
            onClick={handleCta}
            disabled={!data}
            aria-busy={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ctaLabel}
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'not_started' | 'in_progress' | 'completed' }) {
  if (status === 'in_progress') {
    return (
      <span className="flex-shrink-0 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
        In Progress
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="flex-shrink-0 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
        Completed
      </span>
    );
  }
  return null;
}

function ModuleCard({ mod }: { mod: ModuleDetail }) {
  const lessonsDone = mod.lessonCompletion.filter(Boolean).length;
  const quizDone = mod.has_quiz && mod.quizCompleted ? 1 : 0;
  const total = mod.lesson_count + (mod.has_quiz ? 1 : 0);
  const completedCount = lessonsDone + quizDone;
  const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;
  const allDone = total > 0 && completedCount === total;
  const inProgress = completedCount > 0 && !allDone;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-2">
      {/* Module header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium leading-snug">{mod.title}</span>
            {allDone && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Done
              </span>
            )}
          </div>
          {mod.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
              {mod.description}
            </p>
          )}
        </div>
        {inProgress && (
          <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
            {completedCount}/{total}
          </span>
        )}
      </div>

      {/* Mini progress bar — only when in progress */}
      {inProgress && (
        <div className="h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/50 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Lesson + quiz rows */}
      <div className="space-y-1">
        {Array.from({ length: mod.lesson_count }, (_, i) => {
          const done = mod.lessonCompletion[i] ?? false;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <LessonIcon done={done} />
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                {mod.lessonTitles[i] || `Lesson ${i + 1}`}
              </span>
            </div>
          );
        })}
        {mod.has_quiz && (
          <div className="flex items-center gap-2 text-xs">
            <LessonIcon done={mod.quizCompleted} />
            <span className={mod.quizCompleted ? 'text-foreground' : 'text-muted-foreground'}>
              Quiz
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
        <Check className="w-2.5 h-2.5 text-primary" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-border/60" />
  );
}

function ModuleSkeletons() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-3 w-24" />
      {[1, 2].map((n) => (
        <div key={n} className="rounded-lg border border-border/60 p-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </section>
  );
}
