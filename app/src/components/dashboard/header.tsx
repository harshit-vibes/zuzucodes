'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { UserButton } from '@/components/shared/user-button';

export function DashboardHeader() {
  const pathname = usePathname();

  // Lesson pages have their own self-contained header
  if (pathname.includes('/lesson/')) return null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/50 px-4">
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
