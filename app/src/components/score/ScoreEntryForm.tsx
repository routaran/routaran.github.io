import React, { useState } from 'react';
import { Trophy, Plus, Minus, RotateCcw, Save, AlertTriangle, Info } from 'lucide-react';
import { Button, Card, Alert, Input, Badge } from '../common';
import { cn } from '../../lib/utils';
import { useScoreEntry, useCommonScores, useScoreKeyboard } from '../../hooks/useScoreEntry';
import { formatScore } from '../../lib/validation/scoreValidation';
import type { Match, WinCondition } from '../../types/database';

export interface ScoreEntryFormProps {
  match: Match;
  playDateId: string;
  winCondition: WinCondition;
  targetScore: number;
  onScoreUpdated?: (match: Match) => void;
  onClose?: () => void;
  className?: string;
}

export function ScoreEntryForm({
  match,
  playDateId,
  winCondition,
  targetScore,
  onScoreUpdated,
  onClose,
  className,
}: ScoreEntryFormProps) {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  const scoreEntry = useScoreEntry({
    match,
    playDateId,
    winCondition,
    targetScore,
    onScoreUpdated,
    onClose,
  });

  const commonScores = useCommonScores(targetScore);
  
  // Enable keyboard shortcuts
  useScoreKeyboard(
    {
      setTeam1Score: scoreEntry.setTeam1Score,
      setTeam2Score: scoreEntry.setTeam2Score,
      submitScore: scoreEntry.submitScore,
      resetScore: scoreEntry.resetScore,
    },
    scoreEntry.team1Score,
    scoreEntry.team2Score,
    true
  );

  const handleTeam1ScoreChange = (value: string) => {
    const score = parseInt(value, 10);
    if (!isNaN(score) && score >= 0 && score <= 30) {
      scoreEntry.setTeam1Score(score);
    }
  };

  const handleTeam2ScoreChange = (value: string) => {
    const score = parseInt(value, 10);
    if (!isNaN(score) && score >= 0 && score <= 30) {
      scoreEntry.setTeam2Score(score);
    }
  };

  const incrementScore = (team: 1 | 2) => {
    if (team === 1) {
      scoreEntry.setTeam1Score(Math.min(30, scoreEntry.team1Score + 1));
    } else {
      scoreEntry.setTeam2Score(Math.min(30, scoreEntry.team2Score + 1));
    }
  };

  const decrementScore = (team: 1 | 2) => {
    if (team === 1) {
      scoreEntry.setTeam1Score(Math.max(0, scoreEntry.team1Score - 1));
    } else {
      scoreEntry.setTeam2Score(Math.max(0, scoreEntry.team2Score - 1));
    }
  };

  if (!scoreEntry.canEdit) {
    return (
      <Card className={cn("p-6", className)}>
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h3 className="font-medium">Cannot Edit Score</h3>
            <p className="text-sm mt-1">
              Only players in this match can update scores.
            </p>
          </div>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enter Score</h3>
          <p className="text-sm text-muted-foreground">
            {winCondition === 'first-to-target' 
              ? `First to ${targetScore}` 
              : `First to ${targetScore}, win by 2`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
          className="text-muted-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard Help */}
      {showKeyboardHelp && (
        <Alert>
          <Info className="h-4 w-4" />
          <div>
            <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
            <ul className="text-xs mt-1 space-y-1">
              <li>← → : Team 1 score</li>
              <li>↑ ↓ : Team 2 score</li>
              <li>Ctrl+Enter : Save score</li>
              <li>Escape : Reset score</li>
            </ul>
          </div>
        </Alert>
      )}

      {/* Error Messages */}
      {scoreEntry.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Invalid Score</h4>
            <ul className="text-sm mt-1 space-y-1">
              {scoreEntry.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Warning Messages */}
      {scoreEntry.warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Warnings</h4>
            <ul className="text-sm mt-1 space-y-1">
              {scoreEntry.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Score Entry */}
      <div className="space-y-4">
        {/* Team 1 */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border-2 transition-colors",
          scoreEntry.winner === 1 && "border-green-500 bg-green-50 dark:bg-green-900/20"
        )}>
          <div className="flex items-center gap-3">
            {scoreEntry.winner === 1 && (
              <Trophy className="h-5 w-5 text-green-600" />
            )}
            <div>
              <p className="font-medium">
                {match.partnership1?.player1?.name || 'Player 1'} & {match.partnership1?.player2?.name || 'Player 2'}
              </p>
              <p className="text-sm text-muted-foreground">Team 1</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => decrementScore(1)}
              disabled={scoreEntry.team1Score <= 0}
              className="h-10 w-10 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={scoreEntry.team1Score}
                onChange={(e) => handleTeam1ScoreChange(e.target.value)}
                className="w-20 text-center text-2xl font-bold h-12"
                min={0}
                max={30}
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => incrementScore(1)}
              disabled={scoreEntry.team1Score >= 30}
              className="h-10 w-10 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Team 2 */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border-2 transition-colors",
          scoreEntry.winner === 2 && "border-green-500 bg-green-50 dark:bg-green-900/20"
        )}>
          <div className="flex items-center gap-3">
            {scoreEntry.winner === 2 && (
              <Trophy className="h-5 w-5 text-green-600" />
            )}
            <div>
              <p className="font-medium">
                {match.partnership2?.player1?.name || 'Player 3'} & {match.partnership2?.player2?.name || 'Player 4'}
              </p>
              <p className="text-sm text-muted-foreground">Team 2</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => decrementScore(2)}
              disabled={scoreEntry.team2Score <= 0}
              className="h-10 w-10 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={scoreEntry.team2Score}
                onChange={(e) => handleTeam2ScoreChange(e.target.value)}
                className="w-20 text-center text-2xl font-bold h-12"
                min={0}
                max={30}
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => incrementScore(2)}
              disabled={scoreEntry.team2Score >= 30}
              className="h-10 w-10 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Common Scores */}
      {commonScores.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Common Scores</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {commonScores.map((score, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => scoreEntry.applyCommonScore(score)}
                className="h-8 text-xs"
              >
                {score.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Score Status */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Current: {formatScore(match.team1_score)}-{formatScore(match.team2_score)}</span>
          {scoreEntry.hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Modified
            </Badge>
          )}
        </div>
        {scoreEntry.winner && (
          <Badge variant="default" className="text-xs">
            Team {scoreEntry.winner} Wins
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={scoreEntry.resetScore}
          disabled={scoreEntry.isSubmitting || !scoreEntry.hasChanges}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        
        <Button
          onClick={scoreEntry.submitScore}
          disabled={scoreEntry.isSubmitting || !scoreEntry.isValid || !scoreEntry.hasChanges}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {scoreEntry.isSubmitting ? 'Saving...' : 'Save Score'}
        </Button>
      </div>
    </Card>
  );
}