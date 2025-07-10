import React from "react";
import { Card } from "../common/Card";
import type { PlayDateWithStats } from "../../lib/supabase/playDates";

export interface DashboardStatsProps {
  playDates: PlayDateWithStats[];
  isLoading?: boolean;
}

export function DashboardStats({ playDates, isLoading }: DashboardStatsProps) {
  // Calculate statistics
  const stats = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = playDates.filter((pd) => {
      const pdDate = new Date(pd.date);
      pdDate.setHours(0, 0, 0, 0);
      return pdDate >= now && pd.status === "scheduled";
    });

    const active = playDates.filter((pd) => pd.status === "active");
    const completed = playDates.filter((pd) => pd.status === "completed");

    const totalMatches = playDates.reduce((sum, pd) => sum + pd.match_count, 0);
    const completedMatches = playDates.reduce(
      (sum, pd) => sum + pd.completed_matches,
      0
    );

    return {
      total: playDates.length,
      upcoming: upcoming.length,
      active: active.length,
      completed: completed.length,
      totalMatches,
      completedMatches,
      matchCompletionRate:
        totalMatches > 0
          ? Math.round((completedMatches / totalMatches) * 100)
          : 0,
    };
  }, [playDates]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Total Play Dates",
      value: stats.total,
      color: "text-gray-900",
      bgColor: "bg-gray-50",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "In Progress",
      value: stats.active,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Match Completion",
      value: `${stats.matchCompletionRate}%`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((stat, index) => (
        <Card key={index} className={`p-4 ${stat.bgColor} border-0`}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
