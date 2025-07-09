import React, { useState } from 'react';
import { Trophy, Zap, Check, X } from 'lucide-react';
import { Button, Card, Badge } from '../common';
import { cn } from '../../lib/utils';
import { useScoreEntry, useCommonScores } from '../../hooks/useScoreEntry';
import { formatScore } from '../../lib/validation/scoreValidation';
import type { Match, WinCondition } from '../../types/database';

export interface QuickScoreEntryProps {
  match: Match;
  playDateId: string;
  winCondition: WinCondition;
  targetScore: number;
  onScoreUpdated?: (match: Match) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function QuickScoreEntry({
  match,
  playDateId,
  winCondition,
  targetScore,
  onScoreUpdated,
  className,
  size = 'md',
}: QuickScoreEntryProps) {
  const [selectedScore, setSelectedScore] = useState<{ team1: number; team2: number } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const scoreEntry = useScoreEntry({
    match,
    playDateId,
    winCondition,
    targetScore,
    onScoreUpdated,
  });

  const commonScores = useCommonScores(targetScore);

  const handleScoreSelect = (score: { team1: number; team2: number }) => {
    setSelectedScore(score);
    setIsConfirming(true);
    scoreEntry.setScores(score.team1, score.team2);
  };

  const handleConfirm = async () => {
    if (!selectedScore) return;
    
    try {
      await scoreEntry.submitScore();
      setIsConfirming(false);
      setSelectedScore(null);
    } catch (error) {
      // Error is handled by the hook
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setSelectedScore(null);
    scoreEntry.resetScore();
  };

  const hasScore = match.team1_score !== null && match.team2_score !== null;
  const buttonSize = size === 'sm' ? 'sm' : 'md';
  const cardPadding = size === 'sm' ? 'p-3' : 'p-4';

  if (!scoreEntry.canEdit) {
    return (
      <Card className={cn(cardPadding, className)}>
        <div className="text-center text-sm text-muted-foreground">
          Score entry not available
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(cardPadding, "space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className={cn("font-medium", size === 'sm' ? 'text-sm' : 'text-base')}>
            Quick Score
          </h3>
        </div>
        
        {hasScore && (
          <Badge variant="secondary" className="text-xs">
            {formatScore(match.team1_score)}-{formatScore(match.team2_score)}
          </Badge>
        )}
      </div>

      {/* Team Names */}
      <div className="space-y-1">
        <div className={cn("flex items-center gap-2", size === 'sm' ? 'text-sm' : 'text-base')}>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="truncate">
            {match.partnership1?.player1?.name || 'Player 1'} & {match.partnership1?.player2?.name || 'Player 2'}
          </span>
        </div>
        <div className={cn("flex items-center gap-2", size === 'sm' ? 'text-sm' : 'text-base')}>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="truncate">
            {match.partnership2?.player1?.name || 'Player 3'} & {match.partnership2?.player2?.name || 'Player 4'}
          </span>
        </div>
      </div>

      {/* Confirmation State */}
      {isConfirming && selectedScore && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Confirm Score</div>
            <div className="text-2xl font-bold">
              {selectedScore.team1} - {selectedScore.team2}
            </div>
            {scoreEntry.winner && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">
                  Team {scoreEntry.winner} Wins
                </span>
              </div>
            )}
          </div>

          {/* Error/Warning Messages */}
          {(scoreEntry.errors.length > 0 || scoreEntry.warnings.length > 0) && (
            <div className="space-y-1">
              {scoreEntry.errors.map((error, index) => (
                <div key={index} className="text-xs text-destructive">
                  • {error}
                </div>
              ))}
              {scoreEntry.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-warning">
                  • {warning}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handleCancel}
              disabled={scoreEntry.isSubmitting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              variant="default"
              size={buttonSize}
              onClick={handleConfirm}
              disabled={scoreEntry.isSubmitting || !scoreEntry.isValid}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              {scoreEntry.isSubmitting ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </div>
      )}

      {/* Score Selection */}
      {!isConfirming && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Select a common score:
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {commonScores.slice(0, 6).map((score, index) => (
              <Button
                key={index}
                variant="outline"
                size={buttonSize}
                onClick={() => handleScoreSelect(score)}
                className={cn(
                  "h-auto py-2 px-3 font-mono",
                  size === 'sm' ? 'text-xs' : 'text-sm'
                )}
              >
                {score.label}
              </Button>
            ))}
          </div>

          {/* Swap teams button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const swappedScores = commonScores.map(score => ({
                  ...score,
                  team1: score.team2,
                  team2: score.team1,
                  label: `${score.team2}-${score.team1}`,
                }));
                // This would require state management for swapped view
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Swap Teams
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}