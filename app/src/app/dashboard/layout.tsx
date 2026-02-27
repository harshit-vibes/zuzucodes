import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getDashboardStats, getSubscriptionStatus, type SectionStatus } from "@/lib/data";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardMain } from "@/components/dashboard/main";
import { RateLimitProvider } from "@/context/rate-limit-context";
import { RateLimitIndicator } from "@/components/lesson/rate-limit-indicator";
import { SubscriptionProvider } from "@/context/subscription-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = await auth();

  if (!user) {
    redirect("/");
  }

  const courses = await getCoursesForSidebar();
  const courseIds = courses.map((c) => c.id);
  const allModules = courses.flatMap((c) => c.modules);

  const [courseProgress, contentCompletion, stats] = await Promise.all([
    getSidebarProgress(user.id, courseIds),
    allModules.length > 0
      ? getSectionCompletionStatus(user.id, allModules)
      : Promise.resolve({} as Record<string, SectionStatus>),
    getDashboardStats(user.id),
  ]);

  const subscription = await getSubscriptionStatus(user.id);
  const isPaid = subscription?.status === 'ACTIVE';

  return (
    <SubscriptionProvider isPaid={isPaid}>
    <RateLimitProvider>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          courses={courses}
          courseProgress={courseProgress}
          contentCompletion={contentCompletion}
          stats={stats}
        />
        <SidebarInset className="overflow-hidden flex flex-col">
          <DashboardHeader />
          <DashboardMain>{children}</DashboardMain>
          <footer className="shrink-0 h-7 flex items-center justify-end px-4 border-t border-border/30 bg-background/50">
            <RateLimitIndicator />
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </RateLimitProvider>
    </SubscriptionProvider>
  );
}
