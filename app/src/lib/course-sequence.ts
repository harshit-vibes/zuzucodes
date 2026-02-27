// app/src/lib/course-sequence.ts

import type { Module } from '@/lib/data'

export type CourseStep = {
  href: string
  label: string
  type:
    | 'course-intro'
    | 'module-intro'
    | 'lesson-intro'
    | 'lesson-content'
    | 'lesson-outro'
    | 'quiz'
    | 'module-outro'
    | 'graduation'
    | 'certificate'
}

export function buildCourseSequence(
  courseSlug: string,
  modules: Pick<Module, 'id' | 'slug' | 'title' | 'quiz_form'>[],
  lessonsByModule: Record<string, Array<{ lesson_index: number; title: string }>>,
): CourseStep[] {
  const steps: CourseStep[] = []
  const base = `/dashboard/course/${courseSlug}`

  steps.push({ href: base, label: 'Welcome', type: 'course-intro' })

  for (const mod of modules) {
    steps.push({
      href: `${base}/${mod.slug}`,
      label: mod.title,
      type: 'module-intro',
    })

    // Sort defensively — callers may not guarantee order
    const lessons = [...(lessonsByModule[mod.id] ?? [])].sort(
      (a, b) => a.lesson_index - b.lesson_index,
    )
    for (const lesson of lessons) {
      const order = lesson.lesson_index + 1
      const lessonBase = `${base}/${mod.slug}/lesson/${order}`
      steps.push({ href: `${lessonBase}/intro`, label: lesson.title, type: 'lesson-intro' })
      steps.push({ href: lessonBase, label: lesson.title, type: 'lesson-content' })
      steps.push({ href: `${lessonBase}/outro`, label: lesson.title, type: 'lesson-outro' })
    }

    if (mod.quiz_form) {
      steps.push({
        href: `${base}/${mod.slug}/quiz`,
        label: `${mod.title} Quiz`,
        type: 'quiz',
      })
    }

    steps.push({
      href: `${base}/${mod.slug}/outro`,
      label: mod.title,
      type: 'module-outro',
    })
  }

  steps.push({ href: `${base}/graduation`, label: 'Graduation', type: 'graduation' })
  steps.push({ href: `${base}/certificate`, label: 'Certificate', type: 'certificate' })

  return steps
}
