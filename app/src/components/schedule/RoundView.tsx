import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '../common';
import { MatchCard } from './MatchCard';
import type { RoundWithScores } from '../../hooks/useSchedule';
import type { Court } from '../../types/database';

interface RoundViewProps {
  round: RoundWithScores;
  playDateId: string;
  isCurrentRound: boolean;
  courts?: Court[];
}

export function RoundView({
  round,
  playDateId,
  isCurrentRound,
  courts = []
}: RoundViewProps) {
  // Group matches by court
  const matchesByCourt = round.matches.reduce((acc, match) => {
    const court = match.court || 0;
    if (!acc[court]) acc[court] = [];
    acc[court].push(match);
    return acc;
  }, {} as Record<number, typeof round.matches>);

  // Get court name
  const getCourtName = (courtNumber: number) => {
    const court = courts.find(c => c.number === courtNumber);
    return court?.name || `Court ${courtNumber}`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Bye round display */}
      {round.byePartnership && (
        <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Bye Round</p>
            <p className="text-sm text-muted-foreground">
              {round.byePartnership.player1.name} & {round.byePartnership.player2.name} sit out this round
            </p>
          </div>
        </div>
      )}

      {/* Matches by court */}
      {Object.entries(matchesByCourt).map(([courtNum, courtMatches]) => (
        <div key={courtNum} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {getCourtName(Number(courtNum))}
            </h4>
            {isCurrentRound && (
              <Badge variant="outline" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          
          <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
            {courtMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                playDateId={playDateId}
                isCurrentRound={isCurrentRound}
                courtName={getCourtName(match.court || 0)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* No court assigned matches */}
      {matchesByCourt[0] && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            Unassigned Courts
          </h4>
          <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
            {matchesByCourt[0].map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                playDateId={playDateId}
                isCurrentRound={isCurrentRound}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}