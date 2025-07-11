import { supabase } from "../supabase";
import { logger } from "../logger";
import type { SupabaseError } from "./errors";
import type { PlayDateWithDetails, Player } from "../../types/database";

// Types
export interface PlayDate {
  id: string;
  date: string;
  organizer_id: string;
  num_courts: number;
  win_condition: "first_to_target" | "win_by_2";
  target_score: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  schedule_locked: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface PlayDateWithOrganizer extends PlayDate {
  organizer: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PlayDateWithStats extends PlayDateWithOrganizer {
  player_count: number;
  match_count: number;
  completed_matches: number;
}

export type PlayDateStatus = PlayDate["status"];
export type WinCondition = PlayDate["win_condition"];

// Query functions
export async function getPlayDates(options?: {
  status?: PlayDateStatus | PlayDateStatus[];
  organizerId?: string;
  playerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: PlayDateWithStats[] | null; error: SupabaseError | null }> {
  try {
    logger.info("Fetching play dates", {
      component: "playDates",
      action: "getPlayDates",
      metadata: options,
    });

    let query = supabase
      .from("play_dates")
      .select(
        `
        *,
        organizer:players!play_dates_organizer_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .order("date", { ascending: false });

    // Apply filters
    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in("status", options.status);
      } else {
        query = query.eq("status", options.status);
      }
    }

    if (options?.organizerId) {
      query = query.eq("organizer_id", options.organizerId);
    }

    // Filter by player participation
    if (options?.playerId) {
      // This requires a more complex query to find play dates where the player is participating
      const { data: participatingDates, error: participationError } =
        await supabase
          .from("partnerships")
          .select("play_date_id")
          .or(
            `player1_id.eq.${options.playerId},player2_id.eq.${options.playerId}`
          );

      if (participationError) {
        throw participationError;
      }

      const playDateIds = participatingDates?.map((p) => p.play_date_id) || [];
      if (playDateIds.length > 0) {
        query = query.in("id", playDateIds);
      } else {
        // No play dates found for this player
        return { data: [], error: null };
      }
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options?.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Fetch additional stats for each play date
    const playDatesWithStats = await Promise.all(
      (data || []).map(async (playDate) => {
        // Get player count
        const { count: playerCount } = await supabase
          .from("partnerships")
          .select("*", { count: "exact", head: true })
          .eq("play_date_id", playDate.id);

        // Get match stats
        const { data: matchData } = await supabase
          .from("matches")
          .select("status")
          .eq("play_date_id", playDate.id);

        const matchCount = matchData?.length || 0;
        const completedMatches =
          matchData?.filter((m) => m.status === "completed").length || 0;

        return {
          ...playDate,
          player_count: (playerCount || 0) * 2, // Each partnership has 2 players
          match_count: matchCount,
          completed_matches: completedMatches,
        };
      })
    );

    logger.info("Play dates fetched successfully", {
      component: "playDates",
      action: "getPlayDates",
      metadata: { count: playDatesWithStats.length },
    });

    return { data: playDatesWithStats, error: null };
  } catch (error) {
    logger.error(
      "Failed to fetch play dates",
      {
        component: "playDates",
        action: "getPlayDates",
      },
      error as Error
    );

    return { data: null, error: error as SupabaseError };
  }
}

export async function getPlayDateById(
  id: string
): Promise<{ data: PlayDateWithDetails | null; error: SupabaseError | null }> {
  try {
    logger.info("Fetching play date by ID", {
      component: "playDates",
      action: "getPlayDateById",
      metadata: { id },
    });

    const { data, error } = await supabase
      .from("play_dates")
      .select(
        `
        *,
        organizer:players!play_dates_organizer_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    // Get all players for this play date
    const { data: partnerships, error: partnershipsError } = await supabase
      .from("partnerships")
      .select(
        `
        *,
        player1:players!partnerships_player1_id_fkey (
          id,
          name,
          email,
          is_project_owner
        ),
        player2:players!partnerships_player2_id_fkey (
          id,
          name,
          email,
          is_project_owner
        )
      `
      )
      .eq("play_date_id", id);

    if (partnershipsError) {
      throw partnershipsError;
    }

    // Extract unique players from partnerships
    const playersMap = new Map();
    partnerships?.forEach((partnership) => {
      if (partnership.player1) {
        playersMap.set(partnership.player1.id, partnership.player1);
      }
      if (partnership.player2) {
        playersMap.set(partnership.player2.id, partnership.player2);
      }
    });
    const players = Array.from(playersMap.values());

    // Get all matches
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("play_date_id", id)
      .order("round_number", { ascending: true })
      .order("court_id", { ascending: true });

    if (matchesError) {
      throw matchesError;
    }

    const playDateWithDetails: PlayDateWithDetails = {
      ...data,
      players,
      partnerships: partnerships || [],
      matches: matches || [],
    };

    logger.info("Play date fetched successfully", {
      component: "playDates",
      action: "getPlayDateById",
      metadata: { id },
    });

    return { data: playDateWithDetails, error: null };
  } catch (error) {
    logger.error(
      "Failed to fetch play date",
      {
        component: "playDates",
        action: "getPlayDateById",
        metadata: { id },
      },
      error as Error
    );

    return { data: null, error: error as SupabaseError };
  }
}

export async function createPlayDate(
  playDate: Omit<PlayDate, "id" | "created_at" | "updated_at" | "version">
): Promise<{ data: PlayDate | null; error: SupabaseError | null }> {
  try {
    logger.info("Creating play date", {
      component: "playDates",
      action: "createPlayDate",
      metadata: { date: playDate.date },
    });

    const { data, error } = await supabase
      .from("play_dates")
      .insert(playDate)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info("Play date created successfully", {
      component: "playDates",
      action: "createPlayDate",
      metadata: { id: data.id },
    });

    return { data, error: null };
  } catch (error) {
    logger.error(
      "Failed to create play date",
      {
        component: "playDates",
        action: "createPlayDate",
      },
      error as Error
    );

    return { data: null, error: error as SupabaseError };
  }
}

export async function updatePlayDate(
  id: string,
  updates: Partial<Omit<PlayDate, "id" | "created_at" | "updated_at">>,
  currentVersion: number
): Promise<{ data: PlayDate | null; error: SupabaseError | null }> {
  try {
    logger.info("Updating play date", {
      component: "playDates",
      action: "updatePlayDate",
      metadata: { id, currentVersion },
    });

    // Optimistic locking
    const { data, error } = await supabase
      .from("play_dates")
      .update({
        ...updates,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("version", currentVersion)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(
          "Play date has been modified by another user. Please refresh and try again."
        );
      }
      throw error;
    }

    logger.info("Play date updated successfully", {
      component: "playDates",
      action: "updatePlayDate",
      metadata: { id },
    });

    return { data, error: null };
  } catch (error) {
    logger.error(
      "Failed to update play date",
      {
        component: "playDates",
        action: "updatePlayDate",
        metadata: { id },
      },
      error as Error
    );

    return { data: null, error: error as SupabaseError };
  }
}

export async function deletePlayDate(
  id: string
): Promise<{ error: SupabaseError | null }> {
  try {
    logger.info("Deleting play date", {
      component: "playDates",
      action: "deletePlayDate",
      metadata: { id },
    });

    const { error } = await supabase.from("play_dates").delete().eq("id", id);

    if (error) {
      throw error;
    }

    logger.info("Play date deleted successfully", {
      component: "playDates",
      action: "deletePlayDate",
      metadata: { id },
    });

    return { error: null };
  } catch (error) {
    logger.error(
      "Failed to delete play date",
      {
        component: "playDates",
        action: "deletePlayDate",
        metadata: { id },
      },
      error as Error
    );

    return { error: error as SupabaseError };
  }
}

// Helper function to check if a user can edit a play date
export function canEditPlayDate(
  playDate: PlayDate,
  playerId: string,
  isProjectOwner: boolean
): boolean {
  // Project owners can edit any play date
  if (isProjectOwner) {
    return true;
  }

  // Organizers can edit their own play dates
  return playDate.organizer_id === playerId;
}

// Helper function to determine if a play date is upcoming
export function isUpcomingPlayDate(playDate: PlayDate): boolean {
  const playDateTime = new Date(playDate.date);
  const now = new Date();

  // Reset time components for date-only comparison
  playDateTime.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return playDateTime >= now && playDate.status === "scheduled";
}

// Helper function to format play date status for display
export function formatPlayDateStatus(status: PlayDateStatus): string {
  const statusMap: Record<PlayDateStatus, string> = {
    scheduled: "Upcoming",
    active: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}
// Generate round-robin schedule for a play date
export async function generateScheduleForPlayDate(
  playDateId: string,
  players: Player[]
) {
  try {
    logger.info("Generating schedule for play date", {
      component: "playDates",
      action: "generateSchedule",
      metadata: { playDateId, playerCount: players.length },
    });

    // Validate player count
    if (players.length < 4) {
      throw new Error("At least 4 players are required for a play date");
    }
    if (players.length > 16) {
      throw new Error("Maximum 16 players allowed per play date");
    }

    // Get play date details to know how many courts
    const { data: playDate, error: playDateError } = await supabase
      .from("play_dates")
      .select("*")
      .eq("id", playDateId)
      .single();

    if (playDateError) throw playDateError;
    if (!playDate) throw new Error("Play date not found");

    // Step 1: Create courts for the play date
    const courts = [];
    for (let i = 1; i <= playDate.num_courts; i++) {
      const { data: court, error: courtError } = await supabase
        .from("courts")
        .insert({
          play_date_id: playDateId,
          court_number: i,
          court_name: `Court ${i}`,
        })
        .select()
        .single();

      if (courtError) throw courtError;
      courts.push(court);
    }

    // Step 2: Generate all possible partnerships (pairs of players)
    const partnerships = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const { data: partnership, error: partnershipError } = await supabase
          .from("partnerships")
          .insert({
            play_date_id: playDateId,
            player1_id: players[i].id,
            player2_id: players[j].id,
            partnership_name: `${players[i].name} & ${players[j].name}`,
          })
          .select()
          .single();

        if (partnershipError) throw partnershipError;
        partnerships.push(partnership);
      }
    }

    // Step 3: Generate round-robin matches
    const matches = [];
    let roundNumber = 1;
    let courtIndex = 0;

    // Create matches where each partnership plays every other partnership once
    for (let i = 0; i < partnerships.length; i++) {
      for (let j = i + 1; j < partnerships.length; j++) {
        const partnership1 = partnerships[i];
        const partnership2 = partnerships[j];

        // Check if these partnerships share a player (can't play against themselves)
        const p1Players = [partnership1.player1_id, partnership1.player2_id];
        const p2Players = [partnership2.player1_id, partnership2.player2_id];
        const hasSharedPlayer = p1Players.some((p) => p2Players.includes(p));

        if (!hasSharedPlayer) {
          // Assign to a court
          const court = courts[courtIndex % courts.length];

          const { data: match, error: matchError } = await supabase
            .from("matches")
            .insert({
              play_date_id: playDateId,
              court_id: court.id,
              round_number: roundNumber,
              partnership1_id: partnership1.id,
              partnership2_id: partnership2.id,
              status: "waiting",
            })
            .select()
            .single();

          if (matchError) throw matchError;
          matches.push(match);

          // Move to next court
          courtIndex++;
          // If we've used all courts, move to next round
          if (courtIndex % courts.length === 0) {
            roundNumber++;
          }
        }
      }
    }

    logger.info("Schedule generated successfully", {
      component: "playDates",
      action: "generateSchedule",
      metadata: {
        playDateId,
        courtsCreated: courts.length,
        partnershipsCreated: partnerships.length,
        matchesCreated: matches.length,
        totalRounds: roundNumber - 1,
      },
    });

    return {
      data: {
        courts: courts.length,
        partnerships: partnerships.length,
        matches: matches.length,
        rounds: roundNumber - 1,
      },
      error: null,
    };
  } catch (error) {
    logger.error(
      "Failed to generate schedule",
      {
        component: "playDates",
        action: "generateSchedule",
        metadata: { playDateId },
      },
      error as Error
    );
    return { data: null, error: error as SupabaseError };
  }
}
export async function exportPlayDateToJson(id: string) {
  return { data: null, error: new Error("Not implemented") };
}
export async function getUserPlayDates(userId: string) {
  // For now, just return all play dates
  // In the future, this could filter by organizer or participant
  return getPlayDates();
}
