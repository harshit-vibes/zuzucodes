import { titleCase } from '@/lib/utils';
import { CourseCard } from './course-card';
import type { Course, CourseProgress } from '@/lib/data';

interface TrackSectionProps {
  tag: string;
  courses: Course[];
  courseProgress: Record<string, CourseProgress>;
}

export function TrackSection({ tag, courses, courseProgress }: TrackSectionProps) {
  const completedCount = courses.filter(
    (c) => courseProgress[c.id]?.status === 'completed',
  ).length;
  const total = courses.length;

  return (
    <section className="space-y-3">
      {/* Track header */}
      <div className="flex items-center gap-3 px-0.5">
        <h2 className="text-sm font-semibold text-foreground">{titleCase(tag)}</h2>
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {courses.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full transition-colors ${
                i < completedCount ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {completedCount} of {total} complete
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {courses.map((course) => (
          <div key={course.id} className="snap-start">
            <CourseCard course={course} progress={courseProgress[course.id]} />
          </div>
        ))}
      </div>
    </section>
  );
}
