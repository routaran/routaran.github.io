import { useState, useEffect, useMemo } from "react";
import { generateRoundRobinSchedule } from "../lib/algorithms/scheduling";
import { db, realtime, supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import type {
  Round,
  Match as ScheduleMatch,
} from "../lib/algorithms/scheduling";
import type { Match, Partnership, Player, Court } from "../types/database";

// Extended match type that includes both scheduling and database properties
export type ScheduleMatchWithScores = ScheduleMatch & {
  team1_score?: number | null;
  team2_score?: number | null;
  version?: number;
};

// Extended round type with score-aware matches
export type RoundWithScores = Omit<Round, "matches"> & {
  matches: ScheduleMatchWithScores[];
};

interface UseScheduleResult {
  rounds: RoundWithScores[] | null;
  currentRound: number | null;
  courts: Court[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSchedule(playDateId: string): UseScheduleResult {
  const [rounds, setRounds] = useState<RoundWithScores[] | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch schedule data
  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info("Fetching schedule data", {
        component: "useSchedule",
        action: "fetchSchedule",
        playDateId,
      });

      // Fetch all necessary data in parallel
      const [playDateData, matchesData, courtsData] = await Promise.all([
        db.getPlayDate(playDateId),
        db.getMatches(playDateId),
        supabase
          .from("courts")
          .select("*")
          .eq("play_date_id", playDateId)
          .order("court_number"),
      ]);

      if (courtsData.error) {
        throw new Error(`Failed to fetch courts: ${courtsData.error.message}`);
      }

      setCourts(courtsData.data || []);

      // Generate the schedule using the algorithm
      const partnerships = playDateData.partnerships || [];
      const players = playDateData.players || [];

      // Transform partnerships to include player details
      const partnershipsWithPlayers = partnerships.map((p: Partnership) => {
        const player1 = players.find((pl: Player) => pl.id === p.player1_id);
        const player2 = players.find((pl: Player) => pl.id === p.player2_id);

        return {
          id: p.id,
          player1: player1 || { id: p.player1_id, name: "Unknown" },
          player2: player2 || { id: p.player2_id, name: "Unknown" },
        };
      });

      // Generate the round-robin schedule
      const generatedRounds = generateRoundRobinSchedule(
        partnershipsWithPlayers
      );

      // Merge with actual match data from database
      const mergedRounds: RoundWithScores[] = generatedRounds.map((round) => {
        const updatedMatches: ScheduleMatchWithScores[] = round.matches.map(
          (scheduleMatch) => {
            // Find corresponding database match
            const dbMatch = matchesData.find(
              (m: Match) =>
                (m.partnership1_id === scheduleMatch.partnership1.id &&
                  m.partnership2_id === scheduleMatch.partnership2.id) ||
                (m.partnership1_id === scheduleMatch.partnership2.id &&
                  m.partnership2_id === scheduleMatch.partnership1.id)
            );

            if (dbMatch) {
              // Find the court for this match
              const matchCourt = courtsData.data?.find(
                (c) => c.id === dbMatch.court_id
              );

              // Merge database data with schedule data
              return {
                ...scheduleMatch,
                id: dbMatch.id,
                team1_score: dbMatch.team1_score,
                team2_score: dbMatch.team2_score,
                court: matchCourt?.court_number || undefined,
                version: dbMatch.version,
              };
            }

            return scheduleMatch;
          }
        );

        return {
          ...round,
          matches: updatedMatches,
        };
      });

      setRounds(mergedRounds);

      logger.info("Schedule data fetched successfully", {
        component: "useSchedule",
        action: "fetchSchedule",
        playDateId,
        metadata: {
          roundCount: mergedRounds.length,
          matchCount: matchesData.length,
          courtCount: courtsData.data?.length || 0,
        },
      });
    } catch (err) {
      const error = err as Error;
      logger.error(
        "Failed to fetch schedule",
        {
          component: "useSchedule",
          action: "fetchSchedule",
          playDateId,
        },
        error
      );
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate current round based on match scores
  const currentRound = useMemo(() => {
    if (!rounds) return null;

    // Find the first round with incomplete matches
    for (const round of rounds) {
      const hasIncompleteMatch = round.matches.some(
        (match) => match.team1_score === null || match.team2_score === null
      );

      if (hasIncompleteMatch) {
        return round.number;
      }
    }

    // All matches complete - we're done
    return rounds.length;
  }, [rounds]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchSchedule();

    // Subscribe to match updates
    const matchSubscription = realtime.subscribeToMatches(
      playDateId,
      (payload) => {
        logger.debug("Match update received in schedule", {
          component: "useSchedule",
          action: "realtimeUpdate",
          playDateId,
          metadata: { event: payload.eventType },
        });

        // Refetch to get updated data
        fetchSchedule();
      }
    );

    return () => {
      if (matchSubscription) {
        realtime.unsubscribe(matchSubscription);
      }
    };
  }, [playDateId]);

  return {
    rounds,
    currentRound,
    courts,
    isLoading,
    error,
    refetch: fetchSchedule,
  };
}
