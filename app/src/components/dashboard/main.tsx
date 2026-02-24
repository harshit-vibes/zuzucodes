'use client';

import { usePathname } from 'next/navigation';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLesson = pathname.includes('/lesson/');

  return (
    <div
      className={
        isLesson
          ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
          : 'flex-1 overflow-auto'
      }
    >
      {children}
    </div>
  );
}
