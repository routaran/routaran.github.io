import React, { useMemo } from 'react';
import { User, Clock, Trophy, AlertCircle, Calendar } from 'lucide-react';
import { Card, Badge, Alert, AlertDescription, AlertTitle } from '../common';
import { MatchCard } from './MatchCard';
import { cn } from '../../lib/utils';
import type { Round, Match } from '../../lib/algorithms/scheduling';

interface PlayerScheduleProps {
  playDateId: string;
  playerId: string;
  rounds: Round[];
  currentRound: number | null;
}

export function PlayerSchedule({
  playDateId,
  playerId,
  rounds,
  currentRound
}: PlayerScheduleProps) {
  // Get all matches for the player
  const playerMatches = useMemo(() => {
    const matches: Array<{
      match: Match & any;
      round: number;
      isBye: boolean;
    }> = [];

    rounds.forEach(round => {
      // Check if player has a bye this round
      const hasBye = round.byePartnership && (
        round.byePartnership.player1.id === playerId ||
        round.byePartnership.player2.id === playerId
      );

      if (hasBye) {
        matches.push({
          match: null,
          round: round.number,
          isBye: true
        });
      }

      // Find player's match in this round
      const playerMatch = round.matches.find(match =>
        match.partnership1.player1.id === playerId ||
        match.partnership1.player2.id === playerId ||
        match.partnership2.player1.id === playerId ||
        match.partnership2.player2.id === playerId
      );

      if (playerMatch) {
        matches.push({
          match: playerMatch,
          round: round.number,
          isBye: false
        });
      }
    });

    return matches;
  }, [rounds, playerId]);

  // Get next match
  const nextMatch = useMemo(() => {
    return playerMatches.find(({ match, round, isBye }) => {
      if (isBye) return false;
      if (!match) return false;
      return match.team1_score === null || match.team2_score === null;
    });
  }, [playerMatches]);

  // Get partner for each match
  const getPartner = (match: Match) => {
    if (match.partnership1.player1.id === playerId) {
      return match.partnership1.player2;
    } else if (match.partnership1.player2.id === playerId) {
      return match.partnership1.player1;
    } else if (match.partnership2.player1.id === playerId) {
      return match.partnership2.player2;
    } else {
      return match.partnership2.player1;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    let played = 0;
    let won = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    playerMatches.forEach(({ match, isBye }) => {
      if (isBye || !match || match.team1_score === null || match.team2_score === null) {
        return;
      }

      played++;

      const isTeam1 = match.partnership1.player1.id === playerId || 
                      match.partnership1.player2.id === playerId;
      
      const myScore = isTeam1 ? match.team1_score : match.team2_score;
      const theirScore = isTeam1 ? match.team2_score : match.team1_score;

      pointsFor += myScore || 0;
      pointsAgainst += theirScore || 0;

      if (myScore > theirScore) {
        won++;
      }
    });

    return {
      played,
      won,
      lost: played - won,
      pointsFor,
      pointsAgainst,
      pointDiff: pointsFor - pointsAgainst
    };
  }, [playerMatches, playerId]);

  return (
    <div className="space-y-6">
      {/* Player Stats Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Your Tournament Stats</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.played}</p>
            <p className="text-sm text-muted-foreground">Matches Played</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{stats.won}</p>
            <p className="text-sm text-muted-foreground">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{stats.lost}</p>
            <p className="text-sm text-muted-foreground">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.pointsFor}</p>
            <p className="text-sm text-muted-foreground">Points For</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.pointsAgainst}</p>
            <p className="text-sm text-muted-foreground">Points Against</p>
          </div>
          <div className="text-center">
            <p className={cn(
              "text-2xl font-bold",
              stats.pointDiff > 0 ? "text-success" : stats.pointDiff < 0 ? "text-destructive" : ""
            )}>
              {stats.pointDiff > 0 ? '+' : ''}{stats.pointDiff}
            </p>
            <p className="text-sm text-muted-foreground">Point Diff</p>
          </div>
        </div>
      </Card>

      {/* Next Match Alert */}
      {nextMatch && !nextMatch.isBye && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Your Next Match</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>
                <strong>Round {nextMatch.round}</strong>
                {nextMatch.round === currentRound && (
                  <Badge variant="default" className="ml-2 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Current Round
                  </Badge>
                )}
              </p>
              {nextMatch.match.court && (
                <p>Court {nextMatch.match.court}</p>
              )}
              <p>Partner: {getPartner(nextMatch.match).name}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Match Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Your Match Schedule
        </h3>
        
        {playerMatches.map(({ match, round, isBye }) => (
          <div key={`round-${round}`} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant={round === currentRound ? "default" : "outline"}
                className="text-xs"
              >
                Round {round}
              </Badge>
              {round === currentRound && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  Active
                </Badge>
              )}
            </div>
            
            {isBye ? (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Bye Round</p>
                    <p className="text-sm text-muted-foreground">
                      You sit out this round
                    </p>
                  </div>
                </div>
              </Card>
            ) : match ? (
              <MatchCard
                match={match}
                playDateId={playDateId}
                isCurrentRound={round === currentRound}
              />
            ) : (
              <Card className="p-4 bg-muted/50">
                <p className="text-muted-foreground text-center">
                  No match scheduled
                </p>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}