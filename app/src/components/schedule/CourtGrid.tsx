import React, { useState, useMemo } from "react";
import { Trophy, Users, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  DropdownSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../common";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type {
  RoundWithScores,
  ScheduleMatchWithScores,
} from "../../hooks/useSchedule";
import type { Court } from "../../types/database";

interface CourtGridProps {
  playDateId: string;
  rounds: RoundWithScores[];
  currentRound: number | null;
  courts?: Court[];
}

export function CourtGrid({
  playDateId,
  rounds,
  currentRound,
  courts = [],
}: CourtGridProps) {
  const { canManagePlayDate } = useAuthStore();
  const [selectedRound, setSelectedRound] = useState(currentRound || 1);

  const isOrganizer = canManagePlayDate(playDateId);

  // Get selected round data
  const round = useMemo(() => {
    return rounds.find((r) => r.number === selectedRound);
  }, [rounds, selectedRound]);

  // Group matches by court
  const matchesByCourt = useMemo(() => {
    if (!round) return {} as Record<number, ScheduleMatchWithScores[]>;
    const grouped: Record<number, ScheduleMatchWithScores[]> = {};

    // Initialize all courts
    const maxCourt = Math.max(
      4, // Default max courts
      ...(round?.matches.map((m) => m.court || 0) || []),
      courts.length
    );

    for (let i = 1; i <= maxCourt; i++) {
      grouped[i] = [];
    }

    // Assign matches to courts
    round?.matches.forEach((match) => {
      const court = match.court || 0;
      if (court > 0) {
        grouped[court].push(match);
      }
    });

    return grouped;
  }, [round, courts]);

  // Unassigned matches
  const unassignedMatches =
    round?.matches.filter((m) => !m.court || m.court === 0) || [];

  const getCourtName = (courtNumber: number) => {
    const court = courts.find((c) => c.number === courtNumber);
    return court?.name || `Court ${courtNumber}`;
  };

  const navigateRound = (direction: "prev" | "next") => {
    const newRound =
      direction === "prev" ? selectedRound - 1 : selectedRound + 1;
    if (newRound >= 1 && newRound <= rounds.length) {
      setSelectedRound(newRound);
    }
  };

  const handleCourtAssignment = async (
    matchId: string,
    courtNumber: number
  ) => {
    // TODO: Implement court assignment update
    console.log("Assigning match", matchId, "to court", courtNumber);
  };

  if (!round) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No round data available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Round Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateRound("prev")}
            disabled={selectedRound === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <DropdownSelect
              value={selectedRound.toString()}
              onValueChange={(value) => setSelectedRound(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((r) => (
                  <SelectItem key={r.number} value={r.number.toString()}>
                    Round {r.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </DropdownSelect>

            {selectedRound === currentRound && (
              <Badge variant="default">
                <Clock className="w-3 h-3 mr-1" />
                Current
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateRound("next")}
            disabled={selectedRound === rounds.length}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>

      {/* Bye Partnership */}
      {round.byePartnership && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Bye Round</p>
              <p className="text-sm text-muted-foreground">
                {round.byePartnership.player1.name} &{" "}
                {round.byePartnership.player2.name}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Court Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {Object.entries(matchesByCourt).map(([courtNum, matches]) => {
          const courtNumber = Number(courtNum);
          const match = matches[0]; // One match per court per round

          return (
            <Card
              key={courtNumber}
              className={cn(
                "p-4 h-full",
                match && selectedRound === currentRound && "ring-2 ring-primary"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{getCourtName(courtNumber)}</h3>
                  {match && selectedRound === currentRound && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>

                {match ? (
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "p-3 rounded-md bg-muted/50",
                        match.team1_score !== null &&
                          match.team1_score > (match.team2_score || 0) &&
                          "bg-success/10"
                      )}
                    >
                      <p className="text-sm font-medium">
                        {match.partnership1.player1.name} &{" "}
                        {match.partnership1.player2.name}
                      </p>
                      {match.team1_score !== null && (
                        <p className="text-lg font-bold mt-1">
                          {match.team1_score}
                        </p>
                      )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                      vs
                    </div>

                    <div
                      className={cn(
                        "p-3 rounded-md bg-muted/50",
                        match.team2_score !== null &&
                          match.team2_score > (match.team1_score || 0) &&
                          "bg-success/10"
                      )}
                    >
                      <p className="text-sm font-medium">
                        {match.partnership2.player1.name} &{" "}
                        {match.partnership2.player2.name}
                      </p>
                      {match.team2_score !== null && (
                        <p className="text-lg font-bold mt-1">
                          {match.team2_score}
                        </p>
                      )}
                    </div>

                    {match.team1_score !== null &&
                      match.team2_score !== null && (
                        <div className="flex items-center justify-center pt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p className="text-sm">No match assigned</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Unassigned Matches */}
      {unassignedMatches.length > 0 && isOrganizer && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Unassigned Matches</h3>
          <div className="space-y-2">
            {unassignedMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {match.partnership1.player1.name} &{" "}
                    {match.partnership1.player2.name}
                  </p>
                  <p className="text-muted-foreground">vs</p>
                  <p className="font-medium">
                    {match.partnership2.player1.name} &{" "}
                    {match.partnership2.player2.name}
                  </p>
                </div>

                <Select
                  onValueChange={(value) =>
                    handleCourtAssignment(match.id, Number(value))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Assign court" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(matchesByCourt).map((courtNum) => (
                      <SelectItem
                        key={courtNum}
                        value={courtNum}
                        disabled={matchesByCourt[Number(courtNum)].length > 0}
                      >
                        {getCourtName(Number(courtNum))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
