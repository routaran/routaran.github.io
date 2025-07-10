import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, Trophy } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';
import { useSchedule } from '../../hooks/useSchedule';
import { useAuthStore } from '../../stores/authStore';
import { RoundView } from './RoundView';
import { CurrentRoundIndicator } from './CurrentRoundIndicator';
import { PlayerSchedule } from './PlayerSchedule';
import { CourtGrid } from './CourtGrid';
import type { RoundWithScores } from '../../hooks/useSchedule';

interface ScheduleViewProps {
  playDateId: string;
  viewMode?: 'full' | 'player' | 'courts';
}

export function ScheduleView({ playDateId, viewMode = 'full' }: ScheduleViewProps) {
  const { rounds, currentRound, isLoading, error } = useSchedule(playDateId);
  const { player, isAuthenticated } = useAuthStore();
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [selectedView, setSelectedView] = useState(viewMode);

  // Auto-expand current round
  useMemo(() => {
    if (currentRound) {
      setExpandedRounds(prev => new Set([...prev, currentRound]));
    }
  }, [currentRound]);

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundNumber)) {
        next.delete(roundNumber);
      } else {
        next.add(roundNumber);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (rounds) {
      setExpandedRounds(new Set(rounds.map(r => r.number)));
    }
  };

  const collapseAll = () => {
    setExpandedRounds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">Error loading schedule: {error.message}</p>
      </Card>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No schedule generated yet</p>
      </Card>
    );
  }

  // View selector for authenticated users
  const renderViewSelector = () => {
    if (!isAuthenticated() || !player) return null;

    return (
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedView === 'full' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('full')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Full Schedule
        </Button>
        <Button
          variant={selectedView === 'player' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('player')}
        >
          <Users className="w-4 h-4 mr-2" />
          My Schedule
        </Button>
        <Button
          variant={selectedView === 'courts' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedView('courts')}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Court View
        </Button>
      </div>
    );
  };

  // Player-specific view
  if (selectedView === 'player' && player) {
    return (
      <div className="space-y-4">
        {renderViewSelector()}
        <PlayerSchedule
          playDateId={playDateId}
          playerId={player.id}
          rounds={rounds}
          currentRound={currentRound}
        />
      </div>
    );
  }

  // Court grid view
  if (selectedView === 'courts') {
    return (
      <div className="space-y-4">
        {renderViewSelector()}
        <CourtGrid
          playDateId={playDateId}
          rounds={rounds}
          currentRound={currentRound}
        />
      </div>
    );
  }

  // Full schedule view
  return (
    <div className="space-y-4">
      {renderViewSelector()}
      
      {/* Current round indicator */}
      {currentRound && (
        <CurrentRoundIndicator
          currentRound={currentRound}
          totalRounds={rounds.length}
        />
      )}

      {/* Expand/collapse controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tournament Schedule</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {rounds.map((round) => {
          const isExpanded = expandedRounds.has(round.number);
          const isCurrentRound = round.number === currentRound;
          const roundStatus = getRoundStatus(round);

          return (
            <Card
              key={round.number}
              className={cn(
                "transition-all",
                isCurrentRound && "ring-2 ring-primary"
              )}
            >
              <div
                className={cn(
                  "p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                  isCurrentRound && "bg-primary/5"
                )}
                onClick={() => toggleRound(round.number)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">
                      Round {round.number}
                    </h3>
                    {isCurrentRound && (
                      <Badge variant="default">Current</Badge>
                    )}
                    {roundStatus === 'completed' && (
                      <Badge variant="secondary">Completed</Badge>
                    )}
                    {roundStatus === 'upcoming' && (
                      <Badge variant="outline">Upcoming</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {round.matches.length} matches
                      {round.byePartnership && ' • 1 bye'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <RoundView
                    round={round}
                    playDateId={playDateId}
                    isCurrentRound={isCurrentRound}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getRoundStatus(round: RoundWithScores): 'completed' | 'in_progress' | 'upcoming' {
  const allCompleted = round.matches.every(
    match => match.team1_score !== null && match.team2_score !== null
  );
  const anyStarted = round.matches.some(
    match => match.team1_score !== null || match.team2_score !== null
  );

  if (allCompleted) return 'completed';
  if (anyStarted) return 'in_progress';
  return 'upcoming';
}