// app/src/components/course/course-player-shell.tsx

import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';

interface CoursePlayerShellProps {
  eyebrow: string;
  title: string;
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
  nextLocked: boolean;
  scrollable?: boolean;
  isAuthenticated?: boolean;
  children: React.ReactNode;
}

export function CoursePlayerShell({
  eyebrow,
  title,
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
  nextLocked,
  scrollable = true,
  isAuthenticated = false,
  children,
}: CoursePlayerShellProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0" />
        <div className="w-px h-5 bg-border/50 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground/50 tracking-wider uppercase hidden sm:block shrink-0">
            {eyebrow}
          </span>
          <span className="text-border/40 hidden sm:block shrink-0 text-xs">/</span>
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <div className="w-px h-5 bg-border/50 shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          {isAuthenticated && <UserButton />}
        </div>
      </header>

      {/* Content */}
      <div
        className={
          scrollable
            ? 'flex-1 min-h-0 overflow-y-auto'
            : 'flex-1 min-h-0 overflow-hidden flex flex-col'
        }
      >
        {children}
      </div>

      {/* Footer */}
      <footer className="shrink-0 h-12 flex items-center justify-between gap-4 px-6 border-t border-border/30 bg-background/50">
        {prevHref ? (
          <Link
            href={prevHref}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate max-w-[160px]">{prevLabel}</span>
          </Link>
        ) : (
          <div />
        )}

        {nextHref && !nextLocked ? (
          <Link
            href={nextHref}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <span className="truncate max-w-[160px]">{nextLabel}</span>
            <svg aria-hidden="true" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : nextHref && nextLocked ? (
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/25 cursor-not-allowed select-none">
            <span className="truncate max-w-[160px]">{nextLabel}</span>
            <svg aria-hidden="true" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        ) : (
          <div />
        )}
      </footer>
    </div>
  );
}
