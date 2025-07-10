import React, { useState } from "react";
import {
  History,
  RefreshCw,
  User,
  Clock,
  Edit3,
  ChevronDown,
  ChevronRight,
  Monitor,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button, Card, Badge, Alert, LoadingSpinner } from "../common";
import { cn } from "../../lib/utils";
import {
  useFormattedScoreHistory,
  useScoreHistoryStats,
} from "../../hooks/useScoreHistory";
import type { ScoreHistoryEntry } from "../../lib/supabase/scores";

export interface ScoreHistoryProps {
  matchId: string;
  className?: string;
  showStats?: boolean;
  maxHeight?: string;
}

export function ScoreHistory({
  matchId,
  className,
  showStats = true,
  maxHeight = "max-h-96",
}: ScoreHistoryProps) {
  const [_isExpanded, _setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { history, loading, error, hasHistory, refreshHistory, clearError } =
    useFormattedScoreHistory(matchId);

  const { stats } = useScoreHistoryStats(matchId);

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading history...
          </span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h3 className="font-medium">Error Loading History</h3>
            <p className="text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearError();
                refreshHistory();
              }}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </Alert>
      </Card>
    );
  }

  if (!hasHistory) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No score changes yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Score History</h3>
            <Badge variant="secondary" className="text-xs">
              {history.length} {history.length === 1 ? "change" : "changes"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={refreshHistory}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {stats.uniqueEditors}{" "}
              {stats.uniqueEditors === 1 ? "editor" : "editors"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.lastEdit &&
                `Last: ${new Date(stats.lastEdit).toLocaleTimeString()}`}
            </span>
          </div>
        )}
      </div>

      {/* History List */}
      <div className={cn("overflow-y-auto", maxHeight)}>
        {history.map((entry, index) => (
          <ScoreHistoryItem
            key={entry.id}
            entry={entry}
            showDetails={showDetails}
            isFirst={index === 0}
            isLast={index === history.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

interface ScoreHistoryItemProps {
  entry: ScoreHistoryEntry & {
    formattedDate: string;
    formattedTime: string;
    relativeTime: string;
    scoreChange: {
      from: string;
      to: string;
    };
    changeDescription: string;
  };
  showDetails: boolean;
  isFirst: boolean;
  isLast: boolean;
}

function ScoreHistoryItem({
  entry,
  showDetails,
  isFirst,
  isLast,
}: ScoreHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn("p-4 border-b last:border-b-0", isFirst && "bg-muted/30")}
    >
      <div className="flex items-start gap-3">
        {/* Timeline indicator */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isFirst ? "bg-primary" : "bg-muted-foreground"
            )}
          ></div>
          {!isLast && <div className="w-px h-8 bg-border mt-2"></div>}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {entry.changeDescription}
              </span>
              <Badge variant="outline" className="text-xs">
                {entry.relativeTime}
              </Badge>
            </div>

            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          {/* Score change */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {entry.scoreChange.from}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded">
              {entry.scoreChange.to}
            </span>
          </div>

          {/* Player info */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              {entry.playerName || "Unknown"} • {entry.formattedTime}
            </span>
            {entry.reason && (
              <>
                <span>•</span>
                <span>{entry.reason}</span>
              </>
            )}
          </div>

          {/* Expanded details */}
          {isExpanded && showDetails && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium">Version:</span>
                  <span className="ml-2">
                    {entry.oldValues.version} → {entry.newValues.version}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Change ID:</span>
                  <span className="ml-2 font-mono">{entry.id.slice(-8)}</span>
                </div>
              </div>

              {entry.userAgent && (
                <div className="flex items-center gap-2 text-xs">
                  <Monitor className="h-3 w-3" />
                  <span className="truncate">{entry.userAgent}</span>
                </div>
              )}

              {entry.ipAddress && (
                <div className="text-xs">
                  <span className="font-medium">IP:</span>
                  <span className="ml-2 font-mono">{entry.ipAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified version for inline display
export function ScoreHistoryInline({
  matchId,
  className,
  maxEntries = 3,
}: {
  matchId: string;
  className?: string;
  maxEntries?: number;
}) {
  const { history, loading, hasHistory } = useFormattedScoreHistory(matchId);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!hasHistory) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No changes</span>
      </div>
    );
  }

  const recentEntries = history.slice(0, maxEntries);

  return (
    <div className={cn("space-y-1", className)}>
      {recentEntries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 text-xs">
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <span className="text-muted-foreground">{entry.relativeTime}</span>
          <span className="font-mono">{entry.scoreChange.to}</span>
          <span className="text-muted-foreground">by {entry.playerName}</span>
        </div>
      ))}

      {history.length > maxEntries && (
        <div className="text-xs text-muted-foreground">
          + {history.length - maxEntries} more changes
        </div>
      )}
    </div>
  );
}
