import { RateLimitProvider } from '@/context/rate-limit-context';

export default function MockCourseLayout({ children }: { children: React.ReactNode }) {
  return <RateLimitProvider>{children}</RateLimitProvider>;
}
