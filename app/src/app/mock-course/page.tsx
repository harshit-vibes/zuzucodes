/**
 * DEVELOPMENT ONLY — delete before shipping.
 *
 * Mock lesson player for testing the fade-section experience.
 * Data lives in mock_data/*.json at the repo root.
 *
 * Visit: http://localhost:3000/mock-course
 * Switch lesson: http://localhost:3000/mock-course?lesson=1
 */

import { SlidesPane } from '@/components/lesson/slides-pane';
import type { LessonData } from '@/lib/data';

import lessonsJson from '@/mock-data/lessons.json';

const lessons = lessonsJson as unknown as LessonData[];

interface PageProps {
  searchParams: Promise<{ lesson?: string }>;
}

export default async function MockCoursePage({ searchParams }: PageProps) {
  const { lesson: lessonParam } = await searchParams;
  const lessonIndex = Math.max(0, Math.min(Number(lessonParam ?? 0) || 0, lessons.length - 1));
  const lesson = lessons[lessonIndex]!;

  return (
    <div className="h-svh flex flex-col bg-background text-foreground overflow-hidden">

      {/* Mock header */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-5 border-b border-border/50 bg-background/95">
        <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-wider">
          mock-course
        </span>
        <span className="text-border/40 text-xs">/</span>
        <span className="text-sm font-medium">{lesson.moduleTitle}</span>
        <span className="text-border/40 text-xs">/</span>
        <span className="text-sm font-medium text-foreground">{lesson.title}</span>

        {/* Lesson switcher */}
        <div className="ml-auto flex items-center gap-1.5">
          {lessons.map((l, i) => (
            <a
              key={l.id}
              href={`/mock-course?lesson=${i}`}
              className={[
                'px-2.5 h-6 rounded text-[11px] font-mono border transition-colors',
                i === lessonIndex
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              ].join(' ')}
            >
              {i + 1}
            </a>
          ))}
        </div>

        <span className="text-[10px] font-mono text-muted-foreground/30 ml-2">
          delete before shipping
        </span>
      </header>

      {/* Split pane */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* Left — slides pane */}
        <div className="w-[48%] border-r border-border/50 overflow-hidden flex flex-col">
          <SlidesPane
            key={lesson.id}
            content={lesson.content}
            problemSummary={lesson.problemSummary}
            problemConstraints={lesson.problemConstraints}
            problemHints={lesson.problemHints}
            testCases={lesson.testCases}
            entryPoint={lesson.entryPoint}
          />
        </div>

        {/* Right — code pane placeholder */}
        <div className="flex-1 bg-zinc-950 flex flex-col items-center justify-center gap-3">
          <span className="font-mono text-zinc-600 text-sm">code editor</span>
          <div className="w-48 h-px bg-zinc-800" />
          <span className="font-mono text-zinc-700 text-xs">
            wire up CodeLessonLayout when ready
          </span>
        </div>

      </div>
    </div>
  );
}
