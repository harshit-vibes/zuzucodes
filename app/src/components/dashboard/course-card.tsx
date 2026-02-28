import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course, CourseProgress } from '@/lib/data';

const TRACK_GRADIENTS: Record<string, string> = {
  'python':          'from-blue-600/40 to-cyan-500/20',
  'ai foundations':  'from-violet-600/40 to-purple-500/20',
  'agent builders':  'from-amber-600/40 to-orange-400/20',
};
const DEFAULT_GRADIENT = 'from-primary/30 to-primary/10';

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
  const gradient = TRACK_GRADIENTS[course.tag?.toLowerCase() ?? ''] ?? DEFAULT_GRADIENT;
  const showNew = isNew(course.published_at);

  return (
    <Link
      href={`/dashboard/course/${course.slug}`}
      className="group flex-shrink-0 w-56 rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-black/10 transition-all duration-300"
    >
      {/* Thumbnail — full bleed with overlay */}
      <div className={`relative h-40 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {course.thumbnail_url && (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
          />
        )}
        {/* Dark gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* New badge — top right */}
        {showNew && (
          <span className="absolute top-2.5 right-2.5 bg-white/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide uppercase">
            New
          </span>
        )}

        {/* Completed badge */}
        {status === 'completed' && !showNew && (
          <span className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-sm text-white/70 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
            ✓ Done
          </span>
        )}

        {/* Bottom overlay text */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
          {course.tag && (
            <p className="text-[9px] font-mono text-white/50 uppercase tracking-widest mb-0.5">
              {course.tag}
            </p>
          )}
          <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">
            {course.title}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        {progressValue > 0 ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-px bg-border/60 relative overflow-hidden rounded-full">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-primary tabular-nums shrink-0">
              {progressValue}%
            </span>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <span className={cn(
          'flex items-center gap-1 text-xs font-medium shrink-0 transition-all group-hover:gap-1.5',
          status === 'completed' ? 'text-muted-foreground' : 'text-primary',
        )}>
          {ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
