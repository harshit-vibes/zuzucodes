"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, getUniqueTags, titleCase } from "@/lib/utils";
import type { Course } from "@/lib/data";

export function CourseGrid({ courses }: { courses: Course[] }) {
  const tags = useMemo(() => getUniqueTags(courses), [courses]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? courses.filter((c) => c.tag === activeTag)
    : courses;

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
        {filtered.map((course) => (
          <Link
            key={course.id}
            href={`/dashboard/course/${course.id}`}
            className="group relative rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-sm"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-primary" />
            <div className="pl-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold transition-colors group-hover:text-primary">
                    {course.title}
                  </span>
                  {course.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  {course.tag && (
                    <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                      {titleCase(course.tag)}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                  Start learning
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
