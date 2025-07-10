import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePlayDates } from "../hooks/usePlayDates";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { PlayDateList } from "../components/dashboard/PlayDateList";
import { Button } from "../components/common/Button";
import { CalendarPlus, Filter } from "lucide-react";
import type { PlayDateStatus } from "../lib/supabase/playDates";

export function DashboardPage() {
  const navigate = useNavigate();
  const { player, isAuthenticated } = useAuth();
  const [filterStatus, setFilterStatus] = useState<PlayDateStatus | "all">(
    "all"
  );
  const [showOnlyMyPlayDates, setShowOnlyMyPlayDates] = useState(false);

  const { playDates, loading } = usePlayDates();

  const canCreatePlayDate = isAuthenticated && player;

  const handleCreateNew = () => {
    navigate("/play-dates/create");
  };

  const handleEdit = (playDate: any) => {
    navigate(`/play-dates/${playDate.id}/edit`);
  };

  // Filter options
  const filterOptions = [
    { value: "all", label: "All" },
    { value: "scheduled", label: "Upcoming" },
    { value: "active", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {player
                ? `Welcome back, ${player.name}!`
                : "Welcome to Pickleball Tracker"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isAuthenticated
                ? "Manage your play dates and track tournament progress."
                : "Sign in to create and manage play dates."}
            </p>
          </div>
          {canCreatePlayDate && (
            <Button
              onClick={handleCreateNew}
              icon={<CalendarPlus className="w-4 h-4" />}
              size="lg"
            >
              Create Play Date
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <DashboardStats playDates={playDates} isLoading={loading} />

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Play Dates</h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filterStatus === option.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* My Play Dates Toggle */}
            {isAuthenticated && (
              <button
                onClick={() => setShowOnlyMyPlayDates(!showOnlyMyPlayDates)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  showOnlyMyPlayDates
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                My Play Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Play Date List */}
      <PlayDateList
        playDates={playDates}
        isLoading={loading}
        onEdit={handleEdit}
        onCreateNew={canCreatePlayDate ? handleCreateNew : undefined}
        canCreate={canCreatePlayDate}
        emptyStateMessage={
          showOnlyMyPlayDates
            ? "You haven't joined any play dates yet. Browse all play dates to find one to join!"
            : filterStatus !== "all"
              ? `No ${filterStatus} play dates found.`
              : "No play dates found. Create your first one to get started!"
        }
      />
    </div>
  );
}
