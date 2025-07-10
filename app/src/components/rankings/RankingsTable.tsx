/**
 * RankingsTable Component
 *
 * Displays tournament rankings in a comprehensive table format
 * with real-time updates, sorting, and mobile-responsive design
 */

import React, { useState, useMemo } from "react";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import type { PlayerRanking } from "@/lib/calculations/rankings";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

interface RankingsTableProps {
  rankings: PlayerRanking[];
  loading?: boolean;
  error?: string | null;
  onPlayerClick?: (playerId: string) => void;
  showRankingChanges?: boolean;
  rankingChanges?: Map<string, number>;
  compact?: boolean;
  className?: string;
}

type SortField =
  | "rank"
  | "name"
  | "win_percentage"
  | "point_differential"
  | "games_played";
type SortDirection = "asc" | "desc";

export function RankingsTable({
  rankings,
  loading = false,
  error = null,
  onPlayerClick,
  showRankingChanges = false,
  rankingChanges = new Map(),
  compact = false,
  className = "",
}: RankingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  /**
   * Handle column sorting
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
  };

  /**
   * Sort rankings based on current sort settings
   */
  const sortedRankings = useMemo(() => {
    const sorted = [...rankings].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "rank":
          aVal = a.rank;
          bVal = b.rank;
          break;
        case "name":
          aVal = a.player_name;
          bVal = b.player_name;
          break;
        case "win_percentage":
          aVal = a.win_percentage;
          bVal = b.win_percentage;
          break;
        case "point_differential":
          aVal = a.point_differential;
          bVal = b.point_differential;
          break;
        case "games_played":
          aVal = a.games_played;
          bVal = b.games_played;
          break;
        default:
          aVal = a.rank;
          bVal = b.rank;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [rankings, sortField, sortDirection]);

  /**
   * Get ranking change indicator
   */
  const getRankingChangeIndicator = (playerId: string) => {
    if (!showRankingChanges) return null;

    const change = rankingChanges.get(playerId) || 0;
    if (change === 0) return null;

    const isPositive = change > 0;
    const Icon = isPositive ? ChevronUpIcon : ChevronDownIcon;
    const colorClass = isPositive ? "text-green-600" : "text-red-600";
    const bgColorClass = isPositive ? "bg-green-50" : "bg-red-50";

    return (
      <div
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColorClass} ${colorClass}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {Math.abs(change)}
      </div>
    );
  };

  /**
   * Get rank display with trophy for top 3
   */
  const getRankDisplay = (rank: number) => {
    if (rank <= 3) {
      const colors = ["text-yellow-600", "text-gray-600", "text-amber-600"];
      const bgColors = ["bg-yellow-50", "bg-gray-50", "bg-amber-50"];

      return (
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${bgColors[rank - 1]} ${colors[rank - 1]}`}
        >
          <TrophyIcon className="w-4 h-4 mr-1" />
          {rank}
        </div>
      );
    }

    return <span className="text-sm font-medium text-gray-900">{rank}</span>;
  };

  /**
   * Render sort header
   */
  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <th
      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field &&
          (sortDirection === "asc" ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          ))}
      </div>
    </th>
  );

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading rankings: {error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${compact ? "p-4" : "p-6"} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`${compact ? "text-lg" : "text-xl"} font-bold text-gray-900`}
        >
          Tournament Rankings
        </h2>
        {loading && <LoadingSpinner size="sm" className="text-blue-600" />}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="rank">Rank</SortHeader>
              <SortHeader field="name">Player</SortHeader>
              {!compact && <SortHeader field="games_played">Games</SortHeader>}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Record
              </th>
              <SortHeader field="win_percentage">Win %</SortHeader>
              <SortHeader field="point_differential">+/-</SortHeader>
              {!compact && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              )}
              {showRankingChanges && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRankings.map((player) => (
              <tr
                key={player.player_id}
                className={`hover:bg-gray-50 transition-colors ${
                  onPlayerClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onPlayerClick?.(player.player_id)}
              >
                <td className="px-3 py-4 whitespace-nowrap">
                  {getRankDisplay(player.rank)}
                </td>

                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {player.player_name}
                  </div>
                </td>

                {!compact && (
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {player.games_played}
                  </td>
                )}

                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="font-medium text-green-600">
                    {player.wins}
                  </span>
                  <span className="mx-1">-</span>
                  <span className="font-medium text-red-600">
                    {player.losses}
                  </span>
                </td>

                <td className="px-3 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      player.win_percentage >= 70
                        ? "success"
                        : player.win_percentage >= 50
                          ? "warning"
                          : "error"
                    }
                    className="text-xs"
                  >
                    {player.win_percentage}%
                  </Badge>
                </td>

                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`font-medium ${
                      player.point_differential > 0
                        ? "text-green-600"
                        : player.point_differential < 0
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {player.point_differential > 0 ? "+" : ""}
                    {player.point_differential}
                  </span>
                </td>

                {!compact && (
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="font-medium text-green-600">
                      {player.points_for}
                    </span>
                    <span className="mx-1">-</span>
                    <span className="font-medium text-red-600">
                      {player.points_against}
                    </span>
                  </td>
                )}

                {showRankingChanges && (
                  <td className="px-3 py-4 whitespace-nowrap">
                    {getRankingChangeIndicator(player.player_id)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rankings.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No rankings data available yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Rankings will appear once matches are completed.
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Compact version for mobile or sidebar display
 */
export function CompactRankingsTable(
  props: Omit<RankingsTableProps, "compact">
) {
  return <RankingsTable {...props} compact={true} />;
}

/**
 * Top 3 podium display for celebration
 */
export function RankingsPodium({
  rankings,
  className = "",
}: {
  rankings: PlayerRanking[];
  className?: string;
}) {
  const topThree = rankings.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <Card
      className={`p-6 bg-gradient-to-br from-yellow-50 to-amber-50 ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
        Tournament Podium
      </h3>

      <div className="flex items-end justify-center space-x-4">
        {/* Second place */}
        {topThree[1] && (
          <div className="text-center">
            <div className="bg-gray-100 rounded-lg p-4 mb-2">
              <TrophyIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {topThree[1].player_name}
              </p>
              <p className="text-xs text-gray-500">
                {topThree[1].win_percentage}% wins
              </p>
            </div>
            <div className="bg-gray-200 h-16 rounded-t-lg flex items-center justify-center">
              <span className="text-gray-600 font-bold text-lg">2</span>
            </div>
          </div>
        )}

        {/* First place */}
        <div className="text-center">
          <div className="bg-yellow-100 rounded-lg p-4 mb-2">
            <TrophyIcon className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">
              {topThree[0].player_name}
            </p>
            <p className="text-xs text-gray-500">
              {topThree[0].win_percentage}% wins
            </p>
          </div>
          <div className="bg-yellow-200 h-20 rounded-t-lg flex items-center justify-center">
            <span className="text-yellow-700 font-bold text-xl">1</span>
          </div>
        </div>

        {/* Third place */}
        {topThree[2] && (
          <div className="text-center">
            <div className="bg-amber-100 rounded-lg p-4 mb-2">
              <TrophyIcon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {topThree[2].player_name}
              </p>
              <p className="text-xs text-gray-500">
                {topThree[2].win_percentage}% wins
              </p>
            </div>
            <div className="bg-amber-200 h-12 rounded-t-lg flex items-center justify-center">
              <span className="text-amber-700 font-bold text-lg">3</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
