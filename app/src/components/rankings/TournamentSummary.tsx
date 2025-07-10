/**
 * TournamentSummary Component
 *
 * Displays comprehensive tournament statistics including completion status,
 * performance metrics, and key highlights
 */

import React from "react";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Progress } from "@/components/common/Progress";
import type { TournamentSummary } from "@/lib/calculations/rankings";
import {
  TrophyIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  FlagIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface TournamentSummaryProps {
  summary: TournamentSummary;
  loading?: boolean;
  className?: string;
}

export function TournamentSummaryCard({
  summary,
  loading: _loading = false,
  className = "",
}: TournamentSummaryProps) {
  /**
   * Get completion status badge
   */
  const getCompletionBadge = (percentage: number) => {
    if (percentage === 100)
      return { variant: "success" as const, label: "Complete" };
    if (percentage >= 75)
      return { variant: "warning" as const, label: "Nearly Done" };
    if (percentage >= 50)
      return { variant: "info" as const, label: "In Progress" };
    return { variant: "default" as const, label: "Starting" };
  };

  const completionBadge = getCompletionBadge(summary.completion_percentage);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Tournament Summary
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Overall tournament statistics and highlights
          </p>
        </div>
        <Badge variant={completionBadge.variant}>{completionBadge.label}</Badge>
      </div>

      <div className="space-y-6">
        {/* Tournament Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />
              Tournament Progress
            </h3>
            <span className="text-sm text-gray-600">
              {summary.completed_matches} of {summary.total_matches} matches
            </span>
          </div>

          <Progress
            value={summary.completion_percentage}
            className="h-3 mb-2"
          />

          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>{summary.completion_percentage}% Complete</span>
            <span>100%</span>
          </div>
        </div>

        {/* Key Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UsersIcon className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Players</p>
                <p className="text-lg font-semibold text-blue-900">
                  {summary.total_players}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-xs text-green-600 font-medium">Matches</p>
                <p className="text-lg font-semibold text-green-900">
                  {summary.total_matches}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FlagIcon className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-xs text-purple-600 font-medium">Avg Score</p>
                <p className="text-lg font-semibold text-purple-900">
                  {summary.average_match_score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ChartBarIcon className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-xs text-orange-600 font-medium">
                  Total Points
                </p>
                <p className="text-lg font-semibold text-orange-900">
                  {summary.total_points_scored}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Score Statistics */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Score Statistics
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Highest Score</span>
                <span className="text-lg font-semibold text-gray-900">
                  {summary.highest_score}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lowest Score</span>
                <span className="text-lg font-semibold text-gray-900">
                  {summary.lowest_score}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Score</span>
                <span className="text-lg font-semibold text-gray-900">
                  {summary.average_match_score}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Highlights */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Tournament Highlights
          </h3>
          <div className="space-y-3">
            {summary.most_wins && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <TrophyIcon className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Most Wins
                    </p>
                    <p className="text-xs text-yellow-700">
                      {summary.most_wins.player_name}
                    </p>
                  </div>
                </div>
                <Badge variant="warning" className="text-xs">
                  {summary.most_wins.wins} wins
                </Badge>
              </div>
            )}

            {summary.best_point_differential && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Best Point Differential
                    </p>
                    <p className="text-xs text-green-700">
                      {summary.best_point_differential.player_name}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="text-xs">
                  +{summary.best_point_differential.point_differential}
                </Badge>
              </div>
            )}

            {summary.completion_percentage === 100 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Tournament Complete!
                    </p>
                    <p className="text-xs text-blue-700">
                      All matches have been played
                    </p>
                  </div>
                </div>
                <Badge variant="info" className="text-xs">
                  {summary.total_matches} matches
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Tournament Status */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Tournament Status
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Match Completion
                </span>
                <span className="text-sm text-gray-600">
                  {summary.completion_percentage}%
                </span>
              </div>
              <Progress value={summary.completion_percentage} className="h-2" />
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Remaining Matches
                </span>
                <span className="text-sm text-gray-600">
                  {summary.total_matches - summary.completed_matches}
                </span>
              </div>
              <Progress
                value={
                  ((summary.total_matches - summary.completed_matches) /
                    summary.total_matches) *
                  100
                }
                className="h-2"
                variant="secondary"
              />
            </div>
          </div>
        </div>

        {/* Quick Facts */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Quick Facts
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Partnerships</p>
              <p className="font-medium text-gray-900">
                {summary.total_partnerships}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Points Range</p>
              <p className="font-medium text-gray-900">
                {summary.lowest_score} - {summary.highest_score}
              </p>
            </div>
            {summary.completion_percentage > 0 && (
              <>
                <div>
                  <p className="text-gray-600">Completed Games</p>
                  <p className="font-medium text-gray-900">
                    {summary.completed_matches}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Points</p>
                  <p className="font-medium text-gray-900">
                    {summary.total_points_scored}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact version for mobile or sidebar display
 */
export function CompactTournamentSummary({
  summary,
  className = "",
}: {
  summary: TournamentSummary;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tournament</h3>
        <Badge
          variant={summary.completion_percentage === 100 ? "success" : "info"}
        >
          {summary.completion_percentage}%
        </Badge>
      </div>

      <div className="space-y-3">
        <Progress value={summary.completion_percentage} className="h-2" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Players</p>
            <p className="font-medium text-gray-900">{summary.total_players}</p>
          </div>
          <div>
            <p className="text-gray-600">Matches</p>
            <p className="font-medium text-gray-900">
              {summary.completed_matches}/{summary.total_matches}
            </p>
          </div>
        </div>

        {summary.most_wins && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">Leading</p>
            <p className="text-sm font-medium text-gray-900">
              {summary.most_wins.player_name} ({summary.most_wins.wins} wins)
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
