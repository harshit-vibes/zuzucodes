import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Course, CourseProgress } from '@/lib/data';

// Tag → gradient fallback when no thumbnail
const TAG_GRADIENTS: Record<string, string> = {
  python:  'from-blue-500/20 to-cyan-500/20',
  ai:      'from-violet-500/20 to-purple-500/20',
  agents:  'from-rose-500/20 to-pink-500/20',
};
const DEFAULT_GRADIENT = 'from-primary/20 to-primary/10';

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  return new Date(publishedAt) > cutoff;
}

interface CourseCardProps {
  course: Course;
  progress: CourseProgress | undefined;
}

export function CourseCard({ course, progress }: CourseCardProps) {
  const status = progress?.status ?? 'not_started';
  const progressValue = progress?.progress ?? 0;
  const ctaLabel =
    status === 'completed' ? 'Review' :
    status === 'in_progress' ? 'Continue' :
    'Start';
  const gradient = TAG_GRADIENTS[course.tag?.toLowerCase() ?? ''] ?? DEFAULT_GRADIENT;
  const showNew = isNew(course.published_at);

  return (
    <Link
      href={`/dashboard/course/${course.slug}`}
      className="group flex-shrink-0 w-64 rounded-xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className={`relative h-36 bg-gradient-to-br ${gradient}`}>
        {course.thumbnail_url && (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover"
          />
        )}
        {showNew && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            New
          </span>
        )}
        {status === 'completed' && (
          <span className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-full text-muted-foreground">
            Completed
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          {course.tag && (
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1">
              {course.tag}
            </p>
          )}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {course.title}
          </p>
        </div>

        {progressValue > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progressValue} className="flex-1 h-1" />
            <span className="text-[10px] font-mono text-primary tabular-nums w-7 text-right">
              {progressValue}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1 border-t border-border/40">
          <span className={cn(
            'flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-2',
            status === 'completed' ? 'text-muted-foreground' : 'text-primary',
          )}>
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
