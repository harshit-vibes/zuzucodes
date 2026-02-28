import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getSubscriptionStatus, type SectionStatus } from "@/lib/data";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { enforceSessionLimit } from "@/lib/actions/session-limit";
import { DashboardMain } from "@/components/dashboard/main";
import { SubscriptionProvider } from "@/context/subscription-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user } = await auth();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Enforce max 2 active sessions — fire and forget
  void enforceSessionLimit();

  const courses = await getCoursesForSidebar();
  const courseIds = courses.map((c) => c.id);
  const allModules = courses.flatMap((c) => c.modules);

  const [courseProgress, contentCompletion] = await Promise.all([
    getSidebarProgress(user.id, courseIds),
    allModules.length > 0
      ? getSectionCompletionStatus(user.id, allModules)
      : Promise.resolve({} as Record<string, SectionStatus>),
  ]);

  const subscription = await getSubscriptionStatus(user.id);
  const isPaid = subscription?.status === 'ACTIVE';

  return (
    <SubscriptionProvider isPaid={isPaid}>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          courses={courses}
          courseProgress={courseProgress}
          contentCompletion={contentCompletion}
          user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
          subscription={subscription}
        />
        <SidebarInset className="overflow-hidden flex flex-col">
          <DashboardMain>{children}</DashboardMain>
        </SidebarInset>
      </SidebarProvider>
    </SubscriptionProvider>
  );
}
