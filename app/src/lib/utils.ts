import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Title-case a tag string: "developer" → "Developer" */
export function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Extract unique tags from courses, sorted alphabetically. */
export function getUniqueTags<T extends { tag: string | null }>(courses: T[]): string[] {
  const tagSet = new Set<string>();
  for (const course of courses) {
    if (course.tag) {
      tagSet.add(course.tag);
    }
  }
  return Array.from(tagSet).sort();
}
