import React, { useState } from 'react';
import { Trophy, Edit2, Check, X, Clock, History, Zap } from 'lucide-react';
import { Card, Button, Input, Badge, useModal } from '../common';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { ScoreEntryModal, QuickScoreEntry, ScoreHistoryInline } from '../score';
import type { Match } from '../../lib/algorithms/scheduling';

interface MatchCardProps {
  match: Match & {
    team1_score?: number | null;
    team2_score?: number | null;
    version?: number;
  };
  playDateId: string;
  winCondition: 'first-to-target' | 'win-by-2';
  targetScore: number;
  isCurrentRound: boolean;
  courtName?: string;
  showQuickEntry?: boolean;
  showHistory?: boolean;
}

export function MatchCard({
  match,
  playDateId,
  winCondition,
  targetScore,
  isCurrentRound,
  courtName,
  showQuickEntry = false,
  showHistory = true
}: MatchCardProps) {
  const { player, canUpdateScore } = useAuthStore();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [team1Score, setTeam1Score] = useState(match.team1_score || 0);
  const [team2Score, setTeam2Score] = useState(match.team2_score || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showScoreHistory, setShowScoreHistory] = useState(false);
  
  // Modal state for enhanced score entry
  const scoreModal = useModal();

  const hasScore = match.team1_score !== null && match.team2_score !== null;
  const isPlayerInMatch = player && (
    match.partnership1.player1.id === player.id ||
    match.partnership1.player2.id === player.id ||
    match.partnership2.player1.id === player.id ||
    match.partnership2.player2.id === player.id
  );

  const canEdit = canUpdateScore(isPlayerInMatch ? player.id : undefined);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await db.updateMatchScore(
        match.id,
        team1Score,
        team2Score,
        match.version || 0
      );
      setIsEditing(false);
      showToast({
        title: 'Score Updated',
        description: 'Match score has been saved successfully.',
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to update score',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreUpdated = (updatedMatch: Match) => {
    // Update local state to reflect the changes
    setTeam1Score(updatedMatch.team1_score || 0);
    setTeam2Score(updatedMatch.team2_score || 0);
    
    // Refresh the match data - would typically come from parent component
    // For now, we'll just trust the updated match data
  };

  const handleCancel = () => {
    setTeam1Score(match.team1_score || 0);
    setTeam2Score(match.team2_score || 0);
    setIsEditing(false);
  };

  const getWinner = () => {
    if (!hasScore) return null;
    if (match.team1_score! > match.team2_score!) return 1;
    if (match.team2_score! > match.team1_score!) return 2;
    return null;
  };

  const winner = getWinner();

  return (
    <Card className={cn(
      "p-4 transition-all",
      isCurrentRound && "shadow-md",
      isPlayerInMatch && "ring-1 ring-primary/20"
    )}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {courtName && (
              <Badge variant="outline" className="text-xs">
                {courtName}
              </Badge>
            )}
            {isCurrentRound && !hasScore && (
              <Badge variant="default" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Now Playing
              </Badge>
            )}
            {hasScore && (
              <Badge variant="secondary" className="text-xs">
                <Check className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1">
              {showHistory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScoreHistory(!showScoreHistory)}
                  className="h-8 px-2"
                  title="View score history"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2"
                title="Quick edit"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={scoreModal.openModal}
                className="h-8 px-2"
                title="Advanced score entry"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Teams and Scores */}
        <div className="space-y-2">
          {/* Team 1 */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded-md transition-colors",
            winner === 1 && "bg-success/10",
            isEditing && "bg-muted/50"
          )}>
            <div className="flex items-center gap-2">
              {winner === 1 && <Trophy className="h-4 w-4 text-success" />}
              <div>
                <p className={cn(
                  "font-medium",
                  winner === 1 && "text-success"
                )}>
                  {match.partnership1.player1.name} & {match.partnership1.player2.name}
                </p>
              </div>
            </div>
            
            {isEditing ? (
              <Input
                type="number"
                value={team1Score}
                onChange={(e) => setTeam1Score(Number(e.target.value))}
                className="w-16 h-8"
                min={0}
                max={21}
              />
            ) : (
              <span className={cn(
                "text-2xl font-bold",
                winner === 1 && "text-success"
              )}>
                {hasScore ? match.team1_score : '-'}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded-md transition-colors",
            winner === 2 && "bg-success/10",
            isEditing && "bg-muted/50"
          )}>
            <div className="flex items-center gap-2">
              {winner === 2 && <Trophy className="h-4 w-4 text-success" />}
              <div>
                <p className={cn(
                  "font-medium",
                  winner === 2 && "text-success"
                )}>
                  {match.partnership2.player1.name} & {match.partnership2.player2.name}
                </p>
              </div>
            </div>
            
            {isEditing ? (
              <Input
                type="number"
                value={team2Score}
                onChange={(e) => setTeam2Score(Number(e.target.value))}
                className="w-16 h-8"
                min={0}
                max={21}
              />
            ) : (
              <span className={cn(
                "text-2xl font-bold",
                winner === 2 && "text-success"
              )}>
                {hasScore ? match.team2_score : '-'}
              </span>
            )}
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        )}

        {/* Quick Score Entry */}
        {showQuickEntry && canEdit && !isEditing && (
          <div className="pt-3 border-t">
            <QuickScoreEntry
              match={match}
              playDateId={playDateId}
              winCondition={winCondition}
              targetScore={targetScore}
              onScoreUpdated={handleScoreUpdated}
              size="sm"
            />
          </div>
        )}

        {/* Score History */}
        {showScoreHistory && showHistory && (
          <div className="pt-3 border-t">
            <ScoreHistoryInline
              matchId={match.id}
              maxEntries={3}
            />
          </div>
        )}
      </div>

      {/* Enhanced Score Entry Modal */}
      <ScoreEntryModal
        isOpen={scoreModal.isOpen}
        onClose={scoreModal.closeModal}
        match={match}
        playDateId={playDateId}
        winCondition={winCondition}
        targetScore={targetScore}
        onScoreUpdated={handleScoreUpdated}
      />
    </Card>
  );
}