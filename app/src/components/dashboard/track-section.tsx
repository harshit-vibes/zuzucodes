import { titleCase } from '@/lib/utils';
import { CourseCard } from './course-card';
import type { Course, CourseProgress } from '@/lib/data';

const TRACK_ACCENTS: Record<string, { bar: string; text: string; count: string }> = {
  'python':          { bar: 'bg-blue-500',   text: 'text-blue-500',   count: 'text-blue-500/70'   },
  'ai foundations':  { bar: 'bg-violet-500', text: 'text-violet-500', count: 'text-violet-500/70' },
  'agent builders':  { bar: 'bg-amber-500',  text: 'text-amber-500',  count: 'text-amber-500/70'  },
};
const DEFAULT_ACCENT = { bar: 'bg-primary', text: 'text-primary', count: 'text-primary/70' };

interface TrackSectionProps {
  tag: string;
  courses: Course[];
  courseProgress: Record<string, CourseProgress>;
}

export function TrackSection({ tag, courses, courseProgress }: TrackSectionProps) {
  const accent = TRACK_ACCENTS[tag.toLowerCase()] ?? DEFAULT_ACCENT;
  const completedCount = courses.filter(
    (c) => courseProgress[c.id]?.status === 'completed',
  ).length;
  const total = courses.length;

  return (
    <section className="space-y-4">
      {/* Track header */}
      <div className="flex items-center gap-3">
        {/* Color accent bar */}
        <div className={`w-0.5 h-5 rounded-full shrink-0 ${accent.bar}`} />
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          {titleCase(tag)}
        </h2>
        {/* Thin separator */}
        <div className="flex-1 h-px bg-border/40" />
        {/* Count */}
        <span className={`text-xs font-mono tabular-nums shrink-0 ${accent.count}`}>
          {completedCount}/{total}
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-3 -mx-0.5 px-0.5 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {courses.map((course) => (
          <div key={course.id} className="snap-start">
            <CourseCard course={course} progress={courseProgress[course.id]} />
          </div>
        ))}
        {/* Fade-out hint on the right */}
        <div className="w-4 shrink-0" />
      </div>
    </section>
  );
}
