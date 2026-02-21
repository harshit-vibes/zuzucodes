'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Minus } from 'lucide-react';
import type { Course, CourseProgress } from '@/lib/data';

interface ModuleDetail {
  id: string;
  title: string;
  section_count: number;
  has_quiz: boolean;
  lessonCompletion: boolean[];
  quizCompleted: boolean;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setData(null);

    fetch(`/api/courses/${course.id}/detail`)
      .then((res) => res.json())
      .then((json: DetailData) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, course.id]);

  const status = courseProgress?.status ?? 'not_started';
  const progressValue = courseProgress?.progress ?? 0;

  const ctaLabel =
    status === 'completed' ? 'Review →' : status === 'in_progress' ? 'Continue →' : 'Start →';

  const handleCta = () => {
    if (!data) return;
    router.push(data.resumeHref);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold leading-snug">
            {course.title}
          </DialogTitle>
          {course.description && (
            <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
          )}
          {progressValue > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <Progress value={progressValue} className="flex-1 h-1.5" />
              <span className="text-xs font-medium text-primary w-8 text-right">
                {progressValue}%
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Module list — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && <ModuleSkeletons />}

          {!loading && data && data.modules.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{mod.title}</span>
                <ModuleStatusBadge mod={mod} />
              </div>
              <div className="space-y-1 pl-2">
                {Array.from({ length: mod.section_count }, (_, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CompletionIcon done={mod.lessonCompletion[i]} />
                    <span className={mod.lessonCompletion[i] ? 'text-foreground' : ''}>
                      Lesson {i + 1}
                    </span>
                  </div>
                ))}
                {mod.has_quiz && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CompletionIcon done={mod.quizCompleted} />
                    <span className={mod.quizCompleted ? 'text-foreground' : ''}>Quiz</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky footer CTA */}
        <div className="px-6 py-4 border-t border-border/50 flex-shrink-0">
          <button
            onClick={handleCta}
            disabled={!data}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ctaLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompletionIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
        <Check className="w-2.5 h-2.5 text-primary" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-border flex items-center justify-center">
      <Minus className="w-2.5 h-2.5 text-muted-foreground/50" />
    </span>
  );
}

function ModuleStatusBadge({ mod }: { mod: ModuleDetail }) {
  const allLessonsDone = mod.lessonCompletion.every(Boolean);
  const fullyDone = allLessonsDone && (!mod.has_quiz || mod.quizCompleted);
  const anyDone = mod.lessonCompletion.some(Boolean) || mod.quizCompleted;

  if (fullyDone) {
    return (
      <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
        Done
      </span>
    );
  }
  if (anyDone) {
    const done = mod.lessonCompletion.filter(Boolean).length;
    const total = mod.section_count + (mod.has_quiz ? 1 : 0);
    return (
      <span className="text-[10px] font-medium text-muted-foreground">
        {done}/{total}
      </span>
    );
  }
  return null;
}

function ModuleSkeletons() {
  return (
    <>
      {[1, 2].map((n) => (
        <div key={n} className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28 ml-2" />
          <Skeleton className="h-3 w-24 ml-2" />
          <Skeleton className="h-3 w-20 ml-2" />
        </div>
      ))}
    </>
  );
}
