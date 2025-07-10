import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import {
  formatPlayDateStatus,
  canEditPlayDate,
  type PlayDateWithStats,
} from "../../lib/supabase/playDates";
import { useAuth } from "../../hooks/useAuth";
import { Calendar, Users, Trophy, Clock, Edit, Eye } from "lucide-react";

export interface PlayDateCardProps {
  playDate: PlayDateWithStats;
  onEdit?: (playDate: PlayDateWithStats) => void;
}

export function PlayDateCard({ playDate, onEdit }: PlayDateCardProps) {
  const { player } = useAuth();
  const canEdit =
    player &&
    canEditPlayDate(playDate, player.id, player.is_project_owner || false);

  // Format date for display
  const formattedDate = React.useMemo(() => {
    const date = new Date(playDate.date);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }, [playDate.date]);

  // Determine status color and icon
  const statusConfig = React.useMemo(() => {
    switch (playDate.status) {
      case "scheduled":
        return {
          color: "text-blue-600 bg-blue-50",
          icon: Calendar,
          pulseClass: "",
        };
      case "active":
        return {
          color: "text-green-600 bg-green-50",
          icon: Clock,
          pulseClass: "animate-pulse",
        };
      case "completed":
        return {
          color: "text-gray-600 bg-gray-50",
          icon: Trophy,
          pulseClass: "",
        };
      case "cancelled":
        return {
          color: "text-red-600 bg-red-50",
          icon: Calendar,
          pulseClass: "",
        };
      default:
        return {
          color: "text-gray-600 bg-gray-50",
          icon: Calendar,
          pulseClass: "",
        };
    }
  }, [playDate.status]);

  const StatusIcon = statusConfig.icon;

  // Calculate match progress
  const matchProgress =
    playDate.match_count > 0
      ? Math.round((playDate.completed_matches / playDate.match_count) * 100)
      : 0;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.pulseClass}`}
              >
                <StatusIcon className="w-3 h-3" />
                {formatPlayDateStatus(playDate.status)}
              </span>
              {playDate.schedule_locked && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-amber-700 bg-amber-50">
                  Schedule Locked
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {formattedDate}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Organized by {playDate.organizer.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center text-gray-400">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {playDate.player_count}
            </p>
            <p className="text-xs text-gray-500">Players</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center text-gray-400">
              <Trophy className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {playDate.completed_matches}/{playDate.match_count}
            </p>
            <p className="text-xs text-gray-500">Matches</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center text-gray-400">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {playDate.num_courts}
            </p>
            <p className="text-xs text-gray-500">Courts</p>
          </div>
        </div>

        {/* Progress bar for active play dates */}
        {playDate.status === "active" && playDate.match_count > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Match Progress</span>
              <span>{matchProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${matchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Game settings */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            {playDate.win_condition === "first_to_target"
              ? `First to ${playDate.target_score}`
              : `Win by 2 (target: ${playDate.target_score})`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link to={`/play-dates/${playDate.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              icon={<Eye className="w-4 h-4" />}
            >
              View Details
            </Button>
          </Link>
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(playDate)}
              icon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
