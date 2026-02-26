"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn, getUniqueTags, titleCase } from "@/lib/utils";
import type { Course, CourseProgress } from "@/lib/data";

const STATUS_ORDER = { in_progress: 0, not_started: 1, completed: 2 } as const;

export function CourseGrid({
  courses,
  courseProgress = {},
}: {
  courses: Course[];
  courseProgress?: Record<string, CourseProgress>;
}) {
  const tags = getUniqueTags(courses);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = (activeTag ? courses.filter((c) => c.tag === activeTag) : [...courses]).sort(
    (a, b) => {
      const statusA = courseProgress[a.id]?.status ?? "not_started";
      const statusB = courseProgress[b.id]?.status ?? "not_started";
      return STATUS_ORDER[statusA] - STATUS_ORDER[statusB];
    }
  );

  return (
    <>
      {/* Filter chips */}
      {tags.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              !activeTag
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                activeTag === tag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {titleCase(tag)}
            </button>
          ))}
        </div>
      )}

      {/* Course cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {filtered.map((course) => {
          const progress = courseProgress[course.id];
          const status = progress?.status ?? "not_started";
          const progressValue = progress?.progress ?? 0;

          const ctaLabel =
            status === "completed" ? "Review" : status === "in_progress" ? "Continue" : "Start";

          return (
            <Link
              key={course.id}
              href={`/dashboard/course/${course.slug}`}
              className="group relative rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-sm text-left w-full block"
            >
              <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-primary" />
              <div className="pl-4">
                <div className="mb-2">
                  {/* Status badge */}
                  {status === "in_progress" && (
                    <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      In Progress
                    </span>
                  )}
                  {status === "completed" && (
                    <span className="inline-block mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                      Completed
                    </span>
                  )}
                  <span className="block font-semibold transition-colors group-hover:text-primary">
                    {course.title}
                  </span>
                  {course.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                {progressValue > 0 && (
                  <div className="flex items-center gap-3 mb-3">
                    <Progress value={progressValue} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium text-primary w-8 text-right">
                      {progressValue}%
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {course.tag && (
                      <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                        {titleCase(course.tag)}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                    {ctaLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
