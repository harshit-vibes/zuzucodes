import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  level?: string | null;
  duration?: string | null;
  index?: number;
  progress?: number;
  status?: 'not_started' | 'in_progress' | 'completed';
  lastAccessed?: string | null;
}

export function CourseCard({
  id,
  title,
  description,
  thumbnail_url,
  level,
  duration,
  index = 0,
  progress = 0,
  status = 'not_started',
  lastAccessed,
}: CourseCardProps) {
  const formatLastAccessed = (date: string | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };
  return (
    <Link
      href={`/dashboard/course/${id}`}
      className="group relative flex flex-col bg-card rounded-xl border border-border/60 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Thumbnail with gradient overlay */}
      <div className="relative h-44 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
        {thumbnail_url ? (
          <Image
            src={thumbnail_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        )}
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />

        {/* Status badge */}
        {status === 'completed' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/90 text-success-foreground text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Meta badges */}
        <div className="flex items-center gap-2 mb-3">
          {level && (
            <span className="label-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
              {level}
            </span>
          )}
          {duration && (
            <span className="label-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {duration}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {description}
          </p>
        )}

        {/* Progress bar and action */}
        <div className="mt-4 pt-4 border-t border-border/50">
          {status !== 'not_started' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {lastAccessed && formatLastAccessed(lastAccessed)}
                </span>
                <span className="text-xs font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              {status === 'not_started' ? 'Start learning' : status === 'completed' ? 'Review' : 'Continue'}
            </span>
            <svg
              className="w-4 h-4 text-primary transform translate-x-0 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
