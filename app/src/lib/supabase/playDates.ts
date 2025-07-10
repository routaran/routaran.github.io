import { supabase } from '../supabase';
import { logger } from '../logger';
import type { SupabaseError } from './errors';

// Types
export interface PlayDate {
  id: string;
  date: string;
  organizer_id: string;
  num_courts: number;
  win_condition: 'first_to_target' | 'win_by_2';
  target_score: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
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

export type PlayDateStatus = PlayDate['status'];
export type WinCondition = PlayDate['win_condition'];

// Query functions
export async function getPlayDates(
  options?: {
    status?: PlayDateStatus | PlayDateStatus[];
    organizerId?: string;
    playerId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: PlayDateWithStats[] | null; error: SupabaseError | null }> {
  try {
    logger.info('Fetching play dates', {
      component: 'playDates',
      action: 'getPlayDates',
      metadata: options,
    });

    let query = db.supabase
      .from('play_dates')
      .select(`
        *,
        organizer:players!play_dates_organizer_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('date', { ascending: false });

    // Apply filters
    if (options?.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options?.organizerId) {
      query = query.eq('organizer_id', options.organizerId);
    }

    // Filter by player participation
    if (options?.playerId) {
      // This requires a more complex query to find play dates where the player is participating
      const { data: participatingDates, error: participationError } = await db.supabase
        .from('partnerships')
        .select('play_date_id')
        .or(`player1_id.eq.${options.playerId},player2_id.eq.${options.playerId}`);

      if (participationError) {
        throw participationError;
      }

      const playDateIds = participatingDates?.map(p => p.play_date_id) || [];
      if (playDateIds.length > 0) {
        query = query.in('id', playDateIds);
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
      query = query.range(options.offset, options.offset + (options?.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Fetch additional stats for each play date
    const playDatesWithStats = await Promise.all(
      (data || []).map(async (playDate) => {
        // Get player count
        const { count: playerCount } = await db.supabase
          .from('partnerships')
          .select('*', { count: 'exact', head: true })
          .eq('play_date_id', playDate.id);

        // Get match stats
        const { data: matchData } = await db.supabase
          .from('matches')
          .select('status')
          .eq('play_date_id', playDate.id);

        const matchCount = matchData?.length || 0;
        const completedMatches = matchData?.filter(m => m.status === 'completed').length || 0;

        return {
          ...playDate,
          player_count: (playerCount || 0) * 2, // Each partnership has 2 players
          match_count: matchCount,
          completed_matches: completedMatches,
        };
      })
    );

    logger.info('Play dates fetched successfully', {
      component: 'playDates',
      action: 'getPlayDates',
      metadata: { count: playDatesWithStats.length },
    });

    return { data: playDatesWithStats, error: null };
  } catch (error) {
    logger.error('Failed to fetch play dates', {
      component: 'playDates',
      action: 'getPlayDates',
    }, error as Error);

    return { data: null, error: error as SupabaseError };
  }
}

export async function getPlayDateById(
  id: string
): Promise<{ data: PlayDateWithStats | null; error: SupabaseError | null }> {
  try {
    logger.info('Fetching play date by ID', {
      component: 'playDates',
      action: 'getPlayDateById',
      metadata: { id },
    });

    const { data, error } = await db.supabase
      .from('play_dates')
      .select(`
        *,
        organizer:players!play_dates_organizer_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Get player count
    const { count: playerCount } = await db.supabase
      .from('partnerships')
      .select('*', { count: 'exact', head: true })
      .eq('play_date_id', id);

    // Get match stats
    const { data: matchData } = await db.supabase
      .from('matches')
      .select('status')
      .eq('play_date_id', id);

    const matchCount = matchData?.length || 0;
    const completedMatches = matchData?.filter(m => m.status === 'completed').length || 0;

    const playDateWithStats = {
      ...data,
      player_count: (playerCount || 0) * 2,
      match_count: matchCount,
      completed_matches: completedMatches,
    };

    logger.info('Play date fetched successfully', {
      component: 'playDates',
      action: 'getPlayDateById',
      metadata: { id },
    });

    return { data: playDateWithStats, error: null };
  } catch (error) {
    logger.error('Failed to fetch play date', {
      component: 'playDates',
      action: 'getPlayDateById',
      metadata: { id },
    }, error as Error);

    return { data: null, error: error as SupabaseError };
  }
}

export async function createPlayDate(
  playDate: Omit<PlayDate, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<{ data: PlayDate | null; error: SupabaseError | null }> {
  try {
    logger.info('Creating play date', {
      component: 'playDates',
      action: 'createPlayDate',
      metadata: { date: playDate.date },
    });

    const { data, error } = await db.supabase
      .from('play_dates')
      .insert(playDate)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('Play date created successfully', {
      component: 'playDates',
      action: 'createPlayDate',
      metadata: { id: data.id },
    });

    return { data, error: null };
  } catch (error) {
    logger.error('Failed to create play date', {
      component: 'playDates',
      action: 'createPlayDate',
    }, error as Error);

    return { data: null, error: error as SupabaseError };
  }
}

export async function updatePlayDate(
  id: string,
  updates: Partial<Omit<PlayDate, 'id' | 'created_at' | 'updated_at'>>,
  currentVersion: number
): Promise<{ data: PlayDate | null; error: SupabaseError | null }> {
  try {
    logger.info('Updating play date', {
      component: 'playDates',
      action: 'updatePlayDate',
      metadata: { id, currentVersion },
    });

    // Optimistic locking
    const { data, error } = await db.supabase
      .from('play_dates')
      .update({
        ...updates,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('version', currentVersion)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Play date has been modified by another user. Please refresh and try again.');
      }
      throw error;
    }

    logger.info('Play date updated successfully', {
      component: 'playDates',
      action: 'updatePlayDate',
      metadata: { id },
    });

    return { data, error: null };
  } catch (error) {
    logger.error('Failed to update play date', {
      component: 'playDates',
      action: 'updatePlayDate',
      metadata: { id },
    }, error as Error);

    return { data: null, error: error as SupabaseError };
  }
}

export async function deletePlayDate(
  id: string
): Promise<{ error: SupabaseError | null }> {
  try {
    logger.info('Deleting play date', {
      component: 'playDates',
      action: 'deletePlayDate',
      metadata: { id },
    });

    const { error } = await db.supabase
      .from('play_dates')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    logger.info('Play date deleted successfully', {
      component: 'playDates',
      action: 'deletePlayDate',
      metadata: { id },
    });

    return { error: null };
  } catch (error) {
    logger.error('Failed to delete play date', {
      component: 'playDates',
      action: 'deletePlayDate',
      metadata: { id },
    }, error as Error);

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
  
  return playDateTime >= now && playDate.status === 'scheduled';
}

// Helper function to format play date status for display
export function formatPlayDateStatus(status: PlayDateStatus): string {
  const statusMap: Record<PlayDateStatus, string> = {
    scheduled: 'Upcoming',
    active: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  
  return statusMap[status] || status;
}