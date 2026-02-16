"use client";

import { useMemo } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Transform data to react-activity-calendar format with levels 0-4
  const calendarData = useMemo(() => {
    // Create a map for quick lookup
    const activityMap: Record<string, number> = {};
    data.forEach((d) => {
      activityMap[d.date] = d.count;
    });

    // Generate data for last 6 months
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 6);

    const activities: Activity[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      const count = activityMap[dateStr] || 0;

      // Map count to level 0-4
      let level: number;
      if (count === 0) level = 0;
      else if (count <= 1) level = 1;
      else if (count <= 3) level = 2;
      else if (count <= 5) level = 3;
      else level = 4;

      activities.push({
        date: dateStr,
        count,
        level,
      });

      current.setDate(current.getDate() + 1);
    }

    return activities;
  }, [data]);

  const totalActivities = data.reduce((sum, d) => sum + d.count, 0);

  // Brand color theme - indigo gradient matching our theme
  const theme = {
    light: ["#e2e8f0", "#c7d2fe", "#a5b4fc", "#818cf8", "#4f46e5"],
    dark: ["#1e293b", "#312e81", "#4338ca", "#6366f1", "#818cf8"],
  };

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 w-full h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Activity</h3>
        <span className="text-xs text-muted-foreground">
          {totalActivities} {totalActivities === 1 ? "activity" : "activities"}
        </span>
      </div>

      <div className="w-fit mx-auto lg:mx-0">
        <ActivityCalendar
          data={calendarData}
          theme={theme}
          colorScheme="light"
          blockSize={11}
          blockMargin={3}
          blockRadius={2}
          fontSize={11}
          showColorLegend={true}
          showTotalCount={false}
          showWeekdayLabels={["mon", "wed", "fri"]}
          labels={{
            legend: {
              less: "Less",
              more: "More",
            },
            months: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            totalCount: "{{count}} activities in {{year}}",
          }}
        />
      </div>
    </div>
  );
}
