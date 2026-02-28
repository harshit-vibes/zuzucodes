import { auth } from '@/lib/auth/server';
import {
  getDashboardStats,
  getResumeData,
  getCourses,
  getCourseWithModules,
  getUserCoursesProgress,
} from '@/lib/data';
import type { Course, CourseProgress } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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

  const [courses, userData] = await Promise.all([
    getCourses(),
    userId
      ? Promise.all([getDashboardStats(userId), getResumeData(userId)])
      : Promise.resolve(null),
  ]);

  const stats = userData?.[0] ?? { streak: 0, coursesInProgress: 0, coursesTotal: 0, quizAverage: null };
  const resumeData = userData?.[1] ?? null;

  const [courseProgress, startCourse] = await Promise.all([
    userId && courses.length > 0
      ? getUserCoursesProgress(userId, courses.map((c) => c.id))
      : Promise.resolve({} as Record<string, CourseProgress>),
    !resumeData && courses.length > 0
      ? getCourseWithModules(courses[0].slug)
      : Promise.resolve(null),
  ]);

  const startUrl = startCourse?.modules[0]
    ? `/dashboard/course/${startCourse.slug}/${startCourse.modules[0].slug}/lesson/1`
    : null;

  const tracks = groupByTrack(courses);

  return (
    <div className="min-h-screen">
      <HeroSection
        firstName={firstName}
        stats={stats}
        resumeData={resumeData}
        startUrl={startUrl}
      />

      {userId && courses.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 py-8 space-y-10">
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
      )}

      {!userId && <UnauthenticatedCTA />}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroSection({
  firstName,
  stats,
  resumeData,
  startUrl,
}: {
  firstName: string;
  stats: { streak: number; coursesInProgress: number; coursesTotal: number };
  resumeData: Awaited<ReturnType<typeof getResumeData>>;
  startUrl: string | null;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative border-b border-border/50">
      <div className="container mx-auto px-6 py-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {stats.streak > 0
            ? `You're on a ${stats.streak}-day streak. Keep building!`
            : resumeData
              ? 'Pick up where you left off.'
              : 'Start your journey to becoming an Agent Architect.'}
        </p>

        {resumeData ? (
          <Link
            href={resumeData.href}
            className="group inline-flex items-center gap-4 rounded-2xl bg-card border border-border/50 p-4 pr-6 transition-all hover:border-primary/30"
          >
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-2 ring-primary/20">
              {resumeData.course.thumbnail_url ? (
                <Image src={resumeData.course.thumbnail_url} alt={resumeData.course.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Play className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Continue learning</p>
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {resumeData.course.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <Progress value={resumeData.progress} className="flex-1 h-1.5" />
                <span className="text-xs font-medium text-primary">{resumeData.progress}%</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ) : startUrl ? (
          <Link
            href={startUrl}
            className="group inline-flex items-center gap-3 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium transition-all hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Start Your Journey
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : null}
      </div>
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
          Sign in to track your progress, earn certificates, and unlock the full learning experience.
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
