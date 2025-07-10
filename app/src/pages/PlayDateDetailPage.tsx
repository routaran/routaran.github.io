import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Download,
  RefreshCw,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { usePlayDate } from "../hooks/usePlayDate";
import { PlayDateForm } from "../components/playdate/PlayDateForm";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import type { PlayDateUpdate } from "../types/database";

export function PlayDateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    playDate,
    loading,
    canEdit,
    isOrganizer,
    isProjectOwner,
    updatePlayDate,
    deletePlayDate,
    regenerateSchedule,
    exportToJson,
  } = usePlayDate(id);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading || !playDate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleUpdate = async (data: PlayDateUpdate) => {
    try {
      await updatePlayDate(data);
      setIsEditing(false);
    } catch {
      // Error is handled in the hook
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await deletePlayDate();
    } catch {
      // Error is handled in the hook
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRegenerateSchedule = () => {
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerateSchedule = async () => {
    try {
      setActionLoading(true);
      await regenerateSchedule();
    } catch {
      // Error is handled in the hook
    } finally {
      setActionLoading(false);
      setShowRegenerateConfirm(false);
    }
  };

  const handleExport = async () => {
    try {
      setActionLoading(true);
      await exportToJson();
    } catch {
      // Error is handled in the hook
    } finally {
      setActionLoading(false);
    }
  };

  const hasMatches = playDate.matches.length > 0;
  const hasScores = playDate.matches.some(
    (m) => m.team1_score !== null || m.team2_score !== null
  );

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Play Date
            </h1>
          </div>

          <Card className="p-6">
            <PlayDateForm
              initialData={playDate}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isEditing={true}
              canEditPlayers={false}
              loading={loading}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/play-dates")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Play Dates
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {playDate.name}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(playDate.date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {playDate.players.length} players
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {playDate.win_condition === "first-to-target"
                    ? "First to"
                    : "Win by 2,"}{" "}
                  {playDate.target_score} points
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {(isOrganizer || isProjectOwner) && (
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                    disabled={actionLoading}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  disabled={actionLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Warning if scores have been entered */}
        {hasScores && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Editing Restricted
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Players and schedule cannot be modified after scores have been
                entered.
              </p>
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players list */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Players ({playDate.players.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {playDate.players.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    {player.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {player.email}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Tournament info */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tournament Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Status
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {!hasMatches
                    ? "Not Started"
                    : hasScores
                      ? "In Progress"
                      : "Scheduled"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Courts
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {playDate.num_courts} court
                  {playDate.num_courts !== 1 ? "s" : ""}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Partnerships
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {playDate.partnerships.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Matches
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {playDate.matches.length}
                </p>
              </div>
            </div>

            {/* Admin actions */}
            {(isOrganizer || isProjectOwner) && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Admin Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {canEdit && (
                    <Button
                      variant="secondary"
                      onClick={handleRegenerateSchedule}
                      disabled={actionLoading || !hasMatches}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Schedule
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      variant="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Play Date
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Schedule preview */}
        {hasMatches && (
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Match Schedule
              </h2>
              <Button
                variant="secondary"
                onClick={() => navigate(`/play-dates/${id}/schedule`)}
              >
                View Full Schedule
              </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {playDate.matches.filter((m) => m.team1_score !== null).length} of{" "}
              {playDate.matches.length} matches completed
            </p>
          </Card>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Play Date?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will permanently delete "{playDate.name}" and all
                associated data including players, matches, and scores. This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={actionLoading}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Regenerate schedule confirmation modal */}
        {showRegenerateConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Regenerate Schedule?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will delete all existing matches and create a new schedule.
                Any scores that have been entered will be lost. This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={confirmRegenerateSchedule}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  {actionLoading ? "Regenerating..." : "Regenerate"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateConfirm(false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
