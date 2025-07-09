import React, { useEffect, useState } from 'react';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import type { Match } from '../../types/database';

export interface LiveScoreIndicatorProps {
  /** Match ID to track */
  matchId: string;
  /** Whether to show match details */
  showDetails?: boolean;
  /** Whether to show live update notifications */
  showNotifications?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when score updates */
  onScoreUpdate?: (match: Match) => void;
}

interface ScoreUpdateAnimation {
  id: string;
  type: 'team1' | 'team2';
  oldScore: number;
  newScore: number;
  timestamp: number;
}

/**
 * Real-time score indicator that shows live updates for a specific match.
 * Displays current scores with smooth animations and update notifications.
 * 
 * @example
 * ```tsx
 * <LiveScoreIndicator 
 *   matchId="match-123"
 *   showDetails={true}
 *   showNotifications={true}
 *   onScoreUpdate={(match) => console.log('Score updated:', match)}
 * />
 * 
 * // Compact mode for cards
 * <LiveScoreIndicator 
 *   matchId="match-123"
 *   compact={true}
 * />
 * ```
 */
export function LiveScoreIndicator({
  matchId,
  showDetails = false,
  showNotifications = false,
  compact = false,
  className,
  onScoreUpdate,
}: LiveScoreIndicatorProps) {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [scoreAnimations, setScoreAnimations] = useState<ScoreUpdateAnimation[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const { showToast } = useToast();

  /**
   * Handle score update animations
   */
  const triggerScoreAnimation = (
    type: 'team1' | 'team2',
    oldScore: number,
    newScore: number
  ) => {
    const animationId = `${type}_${Date.now()}`;
    const animation: ScoreUpdateAnimation = {
      id: animationId,
      type,
      oldScore,
      newScore,
      timestamp: Date.now(),
    };

    setScoreAnimations(prev => [...prev, animation]);

    // Remove animation after 3 seconds
    setTimeout(() => {
      setScoreAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 3000);
  };

  /**
   * Handle real-time match updates
   */
  useRealtimeSubscription(
    {
      table: 'matches',
      filter: `id=eq.${matchId}`,
      enabled: !!matchId,
    },
    (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedMatch = payload.new as Match;
        const previousMatch = currentMatch;

        setCurrentMatch(updatedMatch);
        setLastUpdateTime(new Date());
        setIsLive(true);

        // Trigger animations for score changes
        if (previousMatch) {
          if (previousMatch.team1_score !== updatedMatch.team1_score) {
            triggerScoreAnimation(
              'team1',
              previousMatch.team1_score || 0,
              updatedMatch.team1_score || 0
            );
          }
          if (previousMatch.team2_score !== updatedMatch.team2_score) {
            triggerScoreAnimation(
              'team2',
              previousMatch.team2_score || 0,
              updatedMatch.team2_score || 0
            );
          }
        }

        // Show notification
        if (showNotifications && previousMatch) {
          const scoreChanged = 
            previousMatch.team1_score !== updatedMatch.team1_score ||
            previousMatch.team2_score !== updatedMatch.team2_score;
          
          if (scoreChanged) {
            showToast('Score updated!', 'info');
          }
        }

        // Call callback
        if (onScoreUpdate) {
          onScoreUpdate(updatedMatch);
        }
      }
    }
  );

  /**
   * Check if match is completed
   */
  const isMatchCompleted = currentMatch && 
    currentMatch.team1_score !== null && 
    currentMatch.team2_score !== null;

  /**
   * Get winning team
   */
  const getWinningTeam = (): 'team1' | 'team2' | 'tie' | null => {
    if (!isMatchCompleted) return null;
    
    const team1Score = currentMatch!.team1_score!;
    const team2Score = currentMatch!.team2_score!;
    
    if (team1Score > team2Score) return 'team1';
    if (team2Score > team1Score) return 'team2';
    return 'tie';
  };

  /**
   * Format score display
   */
  const formatScore = (score: number | null): string => {
    return score !== null ? score.toString() : '-';
  };

  /**
   * Get score animation for a team
   */
  const getScoreAnimation = (team: 'team1' | 'team2'): ScoreUpdateAnimation | null => {
    return scoreAnimations.find(a => a.type === team) || null;
  };

  /**
   * Auto-hide live indicator after 5 seconds
   */
  useEffect(() => {
    if (isLive) {
      const timer = setTimeout(() => {
        setIsLive(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLive]);

  if (!currentMatch) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <div className="text-sm text-gray-500">Loading match...</div>
      </div>
    );
  }

  const winningTeam = getWinningTeam();
  const team1Animation = getScoreAnimation('team1');
  const team2Animation = getScoreAnimation('team2');

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-medium">LIVE</span>
          </div>
        )}
        
        {/* Score */}
        <div className="flex items-center gap-1 text-sm font-medium">
          <span className={cn(
            'px-2 py-1 rounded',
            winningTeam === 'team1' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          )}>
            {formatScore(currentMatch.team1_score)}
          </span>
          <span className="text-gray-400">-</span>
          <span className={cn(
            'px-2 py-1 rounded',
            winningTeam === 'team2' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          )}>
            {formatScore(currentMatch.team2_score)}
          </span>
        </div>
        
        {/* Completion indicator */}
        {isMatchCompleted && (
          <Badge variant="success" size="sm">
            Complete
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              Court {currentMatch.court_number} • Round {currentMatch.round_number}
            </h3>
            {isLive && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500 font-medium">LIVE</span>
              </div>
            )}
          </div>
          
          {isMatchCompleted && (
            <Badge variant="success">
              Complete
            </Badge>
          )}
        </div>

        {/* Score display */}
        <div className="flex items-center justify-center gap-8">
          {/* Team 1 Score */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Team 1</div>
            <div className="relative">
              <div className={cn(
                'text-4xl font-bold transition-all duration-300',
                winningTeam === 'team1' ? 'text-green-600' : 'text-gray-900',
                team1Animation && 'animate-pulse'
              )}>
                {formatScore(currentMatch.team1_score)}
              </div>
              
              {/* Animation overlay */}
              {team1Animation && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-sm font-medium text-blue-600 animate-bounce">
                    +{team1Animation.newScore - team1Animation.oldScore}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="text-2xl font-light text-gray-400">-</div>

          {/* Team 2 Score */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Team 2</div>
            <div className="relative">
              <div className={cn(
                'text-4xl font-bold transition-all duration-300',
                winningTeam === 'team2' ? 'text-green-600' : 'text-gray-900',
                team2Animation && 'animate-pulse'
              )}>
                {formatScore(currentMatch.team2_score)}
              </div>
              
              {/* Animation overlay */}
              {team2Animation && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-sm font-medium text-blue-600 animate-bounce">
                    +{team2Animation.newScore - team2Animation.oldScore}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Last Update:</span>
                <div className="font-medium">
                  {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Version:</span>
                <div className="font-medium">
                  {currentMatch.version}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Winner announcement */}
        {isMatchCompleted && winningTeam && winningTeam !== 'tie' && (
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-green-800 font-medium">
              🎉 Team {winningTeam === 'team1' ? '1' : '2'} Wins!
            </div>
          </div>
        )}
        
        {/* Tie announcement */}
        {isMatchCompleted && winningTeam === 'tie' && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-800 font-medium">
              🤝 It's a Tie!
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Simplified live score badge for inline display
 */
export function LiveScoreBadge({ 
  matchId, 
  className 
}: { 
  matchId: string; 
  className?: string; 
}) {
  return (
    <LiveScoreIndicator
      matchId={matchId}
      compact={true}
      className={className}
    />
  );
}

/**
 * Live score display for tournament overview
 */
export function LiveScoreGrid({ 
  matchIds, 
  className 
}: { 
  matchIds: string[]; 
  className?: string; 
}) {
  return (
    <div className={cn('grid gap-4', className)}>
      {matchIds.map(matchId => (
        <LiveScoreIndicator
          key={matchId}
          matchId={matchId}
          compact={true}
          showNotifications={false}
        />
      ))}
    </div>
  );
}