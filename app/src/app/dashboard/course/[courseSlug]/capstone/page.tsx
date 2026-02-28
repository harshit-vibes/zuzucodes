import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import {
  getCourseWithModules,
  getCapstone,
  getUserCapstoneSubmission,
  getLessonsForCourse,
  areAllModulesComplete,
} from '@/lib/data';
import { buildCourseSequence } from '@/lib/course-sequence';
import { CapstoneLayout } from '@/components/capstone/capstone-layout';
import { CoursePlayerShell } from '@/components/course/course-player-shell';
import Link from 'next/link';

interface CapstonePageProps {
  params: Promise<{ courseSlug: string }>;
}

export default async function CapstonePage({ params }: CapstonePageProps) {
  const { courseSlug } = await params;
  const { user } = await auth();

  const course = await getCourseWithModules(courseSlug);
  if (!course || !course.capstone) notFound();

  const capstone = await getCapstone(course.id);
  if (!capstone) notFound();

  const moduleIds = course.modules.map((m) => m.id);

  const [submission, allComplete, allLessonsMap] = await Promise.all([
    user ? getUserCapstoneSubmission(user.id, capstone.id) : Promise.resolve(null),
    user ? areAllModulesComplete(user.id, moduleIds) : Promise.resolve(false),
    getLessonsForCourse(moduleIds),
  ]);

  const steps = buildCourseSequence(courseSlug, course.modules, allLessonsMap, capstone.title);
  const currentHref = `/dashboard/course/${courseSlug}/capstone`;
  const currentIdx = steps.findIndex((s) => s.href === currentHref);
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  // isLocked: unlock if all modules complete OR user already has a prior submission.
  // Unauthenticated users always see the lock screen (allComplete=false, submission=null).
  const isLocked = !allComplete && !submission;

  if (isLocked) {
    return (
      <CoursePlayerShell
        eyebrow="Capstone Project"
        title={capstone.title}
        prevHref={prevStep?.href ?? null}
        prevLabel={prevStep?.label ?? null}
        nextHref={null}
        nextLabel={null}
        nextLocked={true}
      >
        <div className="flex items-center justify-center h-full">
          <div className="bg-card rounded-2xl border border-border/60 p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Capstone Locked</h2>
            <p className="text-muted-foreground mb-6">
              Complete all modules and their quizzes to unlock the capstone project.
            </p>
            <Link
              href={`/dashboard/course/${courseSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Course
            </Link>
          </div>
        </div>
      </CoursePlayerShell>
    );
  }

  return (
    <CapstoneLayout
      capstone={capstone}
      savedCode={submission?.code ?? null}
      savedOutput={submission?.output ?? null}
      isSubmitted={!!submission}
      prevStep={prevStep}
      nextStep={nextStep}
    />
  );
}
