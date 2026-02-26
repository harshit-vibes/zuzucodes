'use client';

import Link from 'next/link';
import { renderTemplate } from '@/components/templates';

interface LessonOverlayProps {
  view: 'intro' | 'outro';
  introContent: unknown | null;
  outroContent: unknown | null;
  lessonTitle: string;
  position: number;
  lessonCount: number;
  prevHref: string;
  nextHref: string;
  hasPrev: boolean;
  hasNext: boolean;
  onEnterLesson: () => void;
}

export function LessonOverlay({
  view,
  introContent,
  outroContent,
  lessonTitle,
  position,
  lessonCount,
  prevHref,
  nextHref,
  hasPrev,
  hasNext,
  onEnterLesson,
}: LessonOverlayProps) {
  const content = view === 'intro' ? introContent : outroContent;
  const templateName = view === 'intro' ? 'lesson-intro' : 'lesson-outro';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-y-auto">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
        <div className="w-20">
          {view === 'intro' && hasPrev ? (
            <Link
              href={prevHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              prev
            </Link>
          ) : null}
        </div>

        <span className="font-mono text-[11px] text-muted-foreground/40 tabular-nums">
          {position} / {lessonCount}
        </span>

        <div className="w-20 flex justify-end">
          {(view === 'outro' || (view === 'intro' && hasNext)) ? (
            <Link
              href={nextHref}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              next
              <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-[600px] space-y-8">
          {/* Lesson label + title */}
          <div>
            <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">
              {view === 'intro' ? 'lesson intro' : 'lesson complete'}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {lessonTitle}
            </h2>
          </div>

          {/* Template content */}
          {content != null
            ? renderTemplate(templateName, content)
            : (
              <p className="text-sm text-muted-foreground/60">
                {view === 'intro' ? 'Ready to begin.' : 'Lesson complete.'}
              </p>
            )}

          {/* Action button */}
          {view === 'intro' ? (
            <button
              onClick={onEnterLesson}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Begin
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onEnterLesson}
              className="flex items-center gap-2 px-4 h-9 rounded border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to lesson
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
