"use client";

import { memo, useMemo } from "react";
import {
  BookOpen,
  ChevronLeft,
  CircleDot,
  Diamond,
  FileText,
  Flame,
  GraduationCap,
  Home,
  Target,
  Timer,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand-logo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CourseWithModules, SidebarCourseProgress, DashboardStats } from "@/lib/data";

// ============================================
// Types
// ============================================

interface AppSidebarProps {
  courses: CourseWithModules[];
  courseProgress?: Record<string, SidebarCourseProgress>;
  contentCompletion?: Record<string, boolean>;
  stats?: DashboardStats;
}

// ============================================
// URL parsing helper
// ============================================

function parseDashboardPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  const courseIdx = parts.indexOf("course");
  if (courseIdx === -1) return { courseSlug: null, moduleSlug: null, contentType: null, order: null };

  const courseSlug = parts[courseIdx + 1] || null;
  const moduleSlug = parts[courseIdx + 2] || null;
  const contentType = parts[courseIdx + 3] as "lesson" | "quiz" | null;
  const order = contentType === "lesson" ? Number(parts[courseIdx + 4]) || null : null;

  return { courseSlug, moduleSlug, contentType, order };
}

// ============================================
// Module accordion item
// ============================================

const ModuleSection = memo(function ModuleSection({
  module,
  courseSlug,
  activeModuleSlug,
  activeContentType,
  activeOrder,
  contentCompletion,
}: {
  module: CourseWithModules["modules"][number];
  courseSlug: string;
  activeModuleSlug: string | null;
  activeContentType: "lesson" | "quiz" | null;
  activeOrder: number | null;
  contentCompletion: Record<string, boolean>;
}) {
  const totalCount = module.contentItems.length;
  const completedCount = module.contentItems.filter((item) => {
    const key = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
    return contentCompletion[key];
  }).length;
  const isModuleComplete = totalCount > 0 && completedCount === totalCount;

  return (
    <div>
      {/* Module header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={cn(
          "text-xs font-medium truncate flex-1",
          isModuleComplete ? "text-muted-foreground" : "text-foreground"
        )}>
          {module.title}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Content items — always visible */}
      <div className="ml-3 pl-3 border-l border-border/50 mt-0.5 space-y-0.5">
        {module.contentItems.map((item) => {
          const completionKey = item.type === "quiz" ? `${module.id}:quiz` : `${module.id}:lesson-${item.index}`;
          const isCompleted = contentCompletion[completionKey] ?? false;

          // For lessons, order is 1-indexed in the URL
          const order = item.type === "lesson" ? item.index + 1 : null;
          const isActive =
            activeModuleSlug === module.slug &&
            activeContentType === item.type &&
            (item.type === "quiz" || activeOrder === order);

          const href =
            item.type === "quiz"
              ? `/dashboard/course/${courseSlug}/${module.slug}/quiz`
              : `/dashboard/course/${courseSlug}/${module.slug}/lesson/${order}`;

          return (
            <Link
              key={completionKey}
              href={href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : isCompleted
                    ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {isActive ? (
                <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : item.type === "quiz" ? (
                <Diamond className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// Sidebar stats (compact 2x2 grid)
// ============================================

function SidebarStats({ stats }: { stats: DashboardStats }) {
  const items = [
    { icon: Flame, value: `${stats.streak}d`, label: "Streak", color: stats.streak > 0 ? "text-warning" : "text-muted-foreground" },
    { icon: Timer, value: `${stats.coursesInProgress}`, label: "In progress", color: "text-primary" },
    { icon: Target, value: stats.quizAverage !== null ? `${stats.quizAverage}%` : "\u2014", label: "Quiz avg", color: stats.quizAverage && stats.quizAverage >= 80 ? "text-success" : "text-muted-foreground" },
    { icon: GraduationCap, value: `${stats.coursesTotal}`, label: "Courses", color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 px-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-card/50 p-2.5">
          <item.icon className={cn("h-3.5 w-3.5 mb-1.5", item.color)} />
          <div className="text-lg font-bold leading-none">{item.value}</div>
          <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main sidebar component
// ============================================

export function AppSidebar({
  courses,
  courseProgress,
  contentCompletion = {},
  stats,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { courseSlug, moduleSlug, contentType, order } = useMemo(
    () => parseDashboardPath(pathname),
    [pathname]
  );

  // Find active course from URL
  const activeCourse = useMemo(
    () => (courseSlug ? courses.find((c) => c.slug === courseSlug) ?? null : null),
    [courseSlug, courses]
  );

  const activeProgress = activeCourse ? courseProgress?.[activeCourse.id] : null;

  // ---- Mode: Dashboard (no active course) ----
  const isDashboard = !activeCourse;

  return (
    <Sidebar collapsible="none" className="border-r border-border/50">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-border/50 px-3 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all">
            <BrandLogo
              width={16}
              height={16}
              className="opacity-90"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate text-foreground">
              zuzu.codes
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {isDashboard ? (
          /* ---- Dashboard mode ---- */
          <>
            <SidebarGroup className="pb-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive
                      tooltip="Dashboard"
                      className="rounded-lg bg-primary/10 text-primary font-medium"
                    >
                      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2">
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Stats */}
            {stats && (
              <SidebarGroup className="py-2">
                <SidebarGroupContent>
                  <SidebarStats stats={stats} />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : (
          /* ---- Course mode ---- */
          <>
            {/* Back to Dashboard */}
            <SidebarGroup className="pb-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className="rounded-lg hover:bg-muted/60 text-muted-foreground"
                    >
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1.5">
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="text-xs">Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Course title + progress */}
            <div className="px-3 pb-3 border-b border-border/50 mb-2">
              <Link
                href="/dashboard"
                className="block group"
              >
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {activeCourse.title}
                </h3>
              </Link>
              {activeProgress && (
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={activeProgress.progress} className="flex-1 h-1.5" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activeProgress.progress}%
                  </span>
                </div>
              )}
            </div>

            {/* Module accordion */}
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <div className="space-y-0.5">
                  {activeCourse.modules.map((mod) => (
                    <ModuleSection
                      key={mod.id}
                      module={mod}
                      courseSlug={activeCourse.slug}
                      activeModuleSlug={moduleSlug}
                      activeContentType={contentType}
                      activeOrder={order}
                      contentCompletion={contentCompletion}
                    />
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Empty State (no courses at all) */}
        {courses.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No courses yet
            </p>
          </div>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 h-11 flex items-center justify-center px-4">
        <p className="text-[10px] text-muted-foreground text-center">
          &copy; 2026 zuzu.codes
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
