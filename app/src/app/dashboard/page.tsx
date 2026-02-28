import { auth } from '@/lib/auth/server';
import {
  getDashboardStats,
  getCourses,
  getUserCoursesProgress,
  getNextAction,
} from '@/lib/data';
import type { Course, CourseProgress, NextAction } from '@/lib/data';
import Link from 'next/link';
import { ArrowRight, Diamond, Play, Sparkles, Trophy } from 'lucide-react';
import { TrackSection } from '@/components/dashboard/track-section';
import { RoadmapCTABanner } from '@/components/dashboard/roadmap-cta-banner';

// ── Group courses by tag, sorted by min course.order within each group ──
function groupByTrack(courses: Course[]): { tag: string; courses: Course[] }[] {
  const map = new Map<string, Course[]>();
  for (const course of courses) {
    const key = course.tag ?? '__other__';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(course);
  }
  return Array.from(map.entries())
    .map(([tag, tagCourses]) => ({
      tag: tag === '__other__' ? 'Other' : tag,
      courses: tagCourses.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => {
      if (a.tag === 'Other') return 1;
      if (b.tag === 'Other') return -1;
      const minA = Math.min(...a.courses.map((c) => c.order));
      const minB = Math.min(...b.courses.map((c) => c.order));
      return minA - minB;
    });
}

export default async function DashboardPage() {
  const { user } = await auth();
  const userId = user?.id;
  const firstName = user?.name?.split(' ')[0] ?? 'Learner';

  const [courses, stats] = await Promise.all([
    getCourses(),
    userId ? getDashboardStats(userId) : null,
  ]);

  const streak = stats?.streak ?? 0;

  const courseProgress =
    userId && courses.length > 0
      ? await getUserCoursesProgress(userId, courses.map((c) => c.id))
      : ({} as Record<string, CourseProgress>);

  const nextAction = userId ? await getNextAction(userId, courses, courseProgress) : null;

  const tracks = groupByTrack(courses);

  return (
    <div className="min-h-screen">
      <HeroSection firstName={firstName} streak={streak} />

      {userId && courses.length > 0 && (
        <>
          <TodaysFocusCard action={nextAction} />
          <div className="container mx-auto px-4 sm:px-6 py-6 space-y-10">
            {tracks.map(({ tag, courses: trackCourses }) => (
              <TrackSection
                key={tag}
                tag={tag}
                courses={trackCourses}
                courseProgress={courseProgress}
              />
            ))}
            <RoadmapCTABanner />
          </div>
        </>
      )}

      {!userId && <UnauthenticatedCTA />}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroSection({ firstName, streak }: { firstName: string; streak: number }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative border-b border-border/40 overflow-hidden">
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative container mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-1">
              {greeting}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
          </div>
          {streak > 0 && (
            <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-xl">🔥</span>
              <span className="text-xs font-bold font-mono text-amber-500 tabular-nums leading-none mt-0.5">
                {streak}d
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Config lookup for each NextAction type (excludes null and all_done — handled separately)
function getActionConfig(action: Exclude<NextAction, null | { type: 'all_done' }>) {
  switch (action.type) {
    case 'start':
      return {
        Icon: Sparkles,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Start your journey',
        subtext: action.course.title,
        cta: 'Begin',
        href: action.href,
      };
    case 'lesson':
      return {
        Icon: Play,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Pick up where you left off',
        subtext: action.moduleTitle,
        cta: 'Continue',
        href: action.href,
      };
    case 'quiz':
      return {
        Icon: Diamond,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10',
        headline: 'Time to test yourself',
        subtext: action.moduleTitle,
        cta: 'Take the quiz',
        href: action.href,
      };
    case 'next_course':
      return {
        Icon: Sparkles,
        iconColor: 'text-primary',
        iconBg: 'bg-primary/10',
        headline: 'Ready for the next challenge',
        subtext: action.course.title,
        cta: 'Start Course',
        href: action.href,
      };
  }
}

function TodaysFocusCard({ action }: { action: NextAction }) {
  if (!action) return null;

  if (action.type === 'all_done') {
    return (
      <div className="container mx-auto px-6 pt-4 pb-0">
        <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold">You&apos;ve finished everything 🎉</p>
            <p className="text-xs text-muted-foreground mt-0.5">More content coming soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const { Icon, iconColor, iconBg, headline, subtext, cta, href } = getActionConfig(action);

  return (
    <div className="container mx-auto px-6 pt-4 pb-0">
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 hover:border-primary/40 hover:bg-primary/[0.08] transition-all"
      >
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtext}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-medium text-primary shrink-0">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </div>
  );
}

function UnauthenticatedCTA() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">Become an Agent Architect</h2>
        <p className="text-muted-foreground mb-6">
          Sign in to track your progress, earn certificates, and unlock the full learning
          experience.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium transition-all hover:bg-primary/90"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
