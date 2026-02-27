'use client';
import { usePathname } from 'next/navigation';
import { RateLimitIndicator } from '@/components/lesson/rate-limit-indicator';

export function RateLimitFooter() {
  const pathname = usePathname();
  if (pathname.includes('/dashboard/course/')) return null;
  return (
    <footer className="shrink-0 h-7 flex items-center justify-end px-4 border-t border-border/30 bg-background/50">
      <RateLimitIndicator />
    </footer>
  );
}
