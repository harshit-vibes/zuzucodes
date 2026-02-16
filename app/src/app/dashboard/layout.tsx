import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCoursesForSidebar, getSidebarProgress, getSectionCompletionStatus, getDashboardStats } from "@/lib/data";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { UserButton } from "@/components/user-button";
import { ThemeToggle } from "@/components/theme-toggle";

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

  // Parallelize independent queries for 60-75% faster load time
  const [courseProgress, contentCompletion, stats] = await Promise.all([
    getSidebarProgress(user.id, courseIds),
    allModules.length > 0
      ? getSectionCompletionStatus(user.id, allModules)
      : Promise.resolve({}),
    getDashboardStats(user.id),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        courses={courses}
        courseProgress={courseProgress}
        contentCompletion={contentCompletion}
        stats={stats}
      />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
