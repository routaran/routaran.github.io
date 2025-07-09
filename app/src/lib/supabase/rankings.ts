/**
 * Supabase queries for rankings and statistics data
 * 
 * Provides efficient data access for ranking calculations using
 * the match_results materialized view and related tables
 */

import { supabase } from '@/lib/supabase'
import { MatchResult, Match, Partnership, Player, PlayDate } from '@/types/database'

export interface RankingsData {
  matchResults: MatchResult[]
  matches: Match[]
  partnerships: Partnership[]
  players: Player[]
}

/**
 * Get all rankings data for a specific play date
 */
export async function getRankingsData(playDateId: string): Promise<RankingsData> {
  try {
    // Fetch all required data in parallel for better performance
    const [matchResultsResponse, matchesResponse, partnershipsResponse, playersResponse] = await Promise.all([
      // Get match results from materialized view
      supabase
        .from('match_results')
        .select('*')
        .eq('play_date_id', playDateId),
      
      // Get all matches for head-to-head calculations
      supabase
        .from('matches')
        .select('*')
        .eq('play_date_id', playDateId),
      
      // Get all partnerships for the play date
      supabase
        .from('partnerships')
        .select('*')
        .eq('play_date_id', playDateId),
      
      // Get all players for the play date
      supabase
        .from('players')
        .select('*')
        .eq('play_date_id', playDateId)
    ])

    // Check for errors
    if (matchResultsResponse.error) {
      throw new Error(`Failed to fetch match results: ${matchResultsResponse.error.message}`)
    }
    if (matchesResponse.error) {
      throw new Error(`Failed to fetch matches: ${matchesResponse.error.message}`)
    }
    if (partnershipsResponse.error) {
      throw new Error(`Failed to fetch partnerships: ${partnershipsResponse.error.message}`)
    }
    if (playersResponse.error) {
      throw new Error(`Failed to fetch players: ${playersResponse.error.message}`)
    }

    return {
      matchResults: matchResultsResponse.data || [],
      matches: matchesResponse.data || [],
      partnerships: partnershipsResponse.data || [],
      players: playersResponse.data || []
    }
  } catch (error) {
    console.error('Error fetching rankings data:', error)
    throw error
  }
}

/**
 * Get historical rankings data for a player across multiple tournaments
 */
export async function getPlayerHistoricalStats(playerId: string): Promise<{
  matchResults: MatchResult[]
  playDates: PlayDate[]
}> {
  try {
    // Get all match results for this player
    const matchResultsResponse = await supabase
      .from('match_results')
      .select('*')
      .eq('player_id', playerId)
      .order('play_date', { ascending: false })

    if (matchResultsResponse.error) {
      throw new Error(`Failed to fetch player historical stats: ${matchResultsResponse.error.message}`)
    }

    // Get play date details
    const playDateIds = [...new Set(matchResultsResponse.data?.map(r => r.play_date_id) || [])]
    
    let playDates: PlayDate[] = []
    if (playDateIds.length > 0) {
      const playDatesResponse = await supabase
        .from('play_dates')
        .select('*')
        .in('id', playDateIds)
        .order('date', { ascending: false })

      if (playDatesResponse.error) {
        throw new Error(`Failed to fetch play dates: ${playDatesResponse.error.message}`)
      }

      playDates = playDatesResponse.data || []
    }

    return {
      matchResults: matchResultsResponse.data || [],
      playDates
    }
  } catch (error) {
    console.error('Error fetching player historical stats:', error)
    throw error
  }
}

/**
 * Get partnership statistics for a specific play date
 */
export async function getPartnershipStats(playDateId: string): Promise<{
  partnerships: Partnership[]
  matches: Match[]
  players: Player[]
}> {
  try {
    const [partnershipsResponse, matchesResponse, playersResponse] = await Promise.all([
      supabase
        .from('partnerships')
        .select('*')
        .eq('play_date_id', playDateId),
      
      supabase
        .from('matches')
        .select('*')
        .eq('play_date_id', playDateId)
        .not('team1_score', 'is', null)
        .not('team2_score', 'is', null),
      
      supabase
        .from('players')
        .select('*')
        .eq('play_date_id', playDateId)
    ])

    if (partnershipsResponse.error) {
      throw new Error(`Failed to fetch partnerships: ${partnershipsResponse.error.message}`)
    }
    if (matchesResponse.error) {
      throw new Error(`Failed to fetch matches: ${matchesResponse.error.message}`)
    }
    if (playersResponse.error) {
      throw new Error(`Failed to fetch players: ${playersResponse.error.message}`)
    }

    return {
      partnerships: partnershipsResponse.data || [],
      matches: matchesResponse.data || [],
      players: playersResponse.data || []
    }
  } catch (error) {
    console.error('Error fetching partnership stats:', error)
    throw error
  }
}

/**
 * Get live rankings data with real-time subscription
 */
export function subscribeToRankingsUpdates(
  playDateId: string,
  onUpdate: (data: MatchResult[]) => void,
  onError: (error: Error) => void
): () => void {
  // Subscribe to match results changes
  const matchResultsSubscription = supabase
    .channel(`match_results:${playDateId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_results',
        filter: `play_date_id=eq.${playDateId}`
      },
      async (payload) => {
        try {
          // Fetch updated match results
          const response = await supabase
            .from('match_results')
            .select('*')
            .eq('play_date_id', playDateId)

          if (response.error) {
            onError(new Error(`Failed to fetch updated match results: ${response.error.message}`))
            return
          }

          onUpdate(response.data || [])
        } catch (error) {
          onError(error as Error)
        }
      }
    )
    .subscribe()

  // Also subscribe to matches table for immediate updates
  const matchesSubscription = supabase
    .channel(`matches:${playDateId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `play_date_id=eq.${playDateId}`
      },
      async (payload) => {
        try {
          // Refresh materialized view and get updated results
          await refreshMatchResultsView()
          
          const response = await supabase
            .from('match_results')
            .select('*')
            .eq('play_date_id', playDateId)

          if (response.error) {
            onError(new Error(`Failed to fetch updated match results: ${response.error.message}`))
            return
          }

          onUpdate(response.data || [])
        } catch (error) {
          onError(error as Error)
        }
      }
    )
    .subscribe()

  // Return cleanup function
  return () => {
    supabase.removeChannel(matchResultsSubscription)
    supabase.removeChannel(matchesSubscription)
  }
}

/**
 * Refresh the match_results materialized view
 * This ensures the latest data is available for rankings
 */
export async function refreshMatchResultsView(): Promise<void> {
  try {
    const response = await supabase
      .rpc('refresh_match_results_view')

    if (response.error) {
      throw new Error(`Failed to refresh match results view: ${response.error.message}`)
    }
  } catch (error) {
    console.error('Error refreshing match results view:', error)
    throw error
  }
}

/**
 * Get tournament completion statistics
 */
export async function getTournamentCompletionStats(playDateId: string): Promise<{
  totalMatches: number
  completedMatches: number
  completionPercentage: number
  remainingMatches: number
}> {
  try {
    const response = await supabase
      .from('matches')
      .select('team1_score, team2_score')
      .eq('play_date_id', playDateId)

    if (response.error) {
      throw new Error(`Failed to fetch tournament completion stats: ${response.error.message}`)
    }

    const matches = response.data || []
    const totalMatches = matches.length
    const completedMatches = matches.filter(match => 
      match.team1_score !== null && match.team2_score !== null
    ).length
    const completionPercentage = totalMatches > 0 
      ? Math.round((completedMatches / totalMatches) * 100)
      : 0
    const remainingMatches = totalMatches - completedMatches

    return {
      totalMatches,
      completedMatches,
      completionPercentage,
      remainingMatches
    }
  } catch (error) {
    console.error('Error fetching tournament completion stats:', error)
    throw error
  }
}

/**
 * Get recent match results for activity feed
 */
export async function getRecentMatchResults(
  playDateId: string,
  limit: number = 10
): Promise<{
  match: Match
  partnership1: Partnership
  partnership2: Partnership
  players: Player[]
}[]> {
  try {
    const response = await supabase
      .from('matches')
      .select(`
        *,
        partnership1:partnerships!partnership1_id (
          *,
          player1:players!player1_id (*),
          player2:players!player2_id (*)
        ),
        partnership2:partnerships!partnership2_id (
          *,
          player1:players!player1_id (*),
          player2:players!player2_id (*)
        )
      `)
      .eq('play_date_id', playDateId)
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (response.error) {
      throw new Error(`Failed to fetch recent match results: ${response.error.message}`)
    }

    return response.data?.map(match => ({
      match,
      partnership1: match.partnership1 as Partnership,
      partnership2: match.partnership2 as Partnership,
      players: [
        (match.partnership1 as any).player1,
        (match.partnership1 as any).player2,
        (match.partnership2 as any).player1,
        (match.partnership2 as any).player2
      ]
    })) || []
  } catch (error) {
    console.error('Error fetching recent match results:', error)
    throw error
  }
}

/**
 * Search for players by name for comparison features
 */
export async function searchPlayersByName(
  query: string,
  limit: number = 10
): Promise<Player[]> {
  try {
    const response = await supabase
      .from('players')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(limit)

    if (response.error) {
      throw new Error(`Failed to search players: ${response.error.message}`)
    }

    return response.data || []
  } catch (error) {
    console.error('Error searching players:', error)
    throw error
  }
}

/**
 * Get player performance trends across multiple tournaments
 */
export async function getPlayerPerformanceTrends(
  playerId: string,
  limit: number = 10
): Promise<{
  playDate: PlayDate
  matchResult: MatchResult
}[]> {
  try {
    const response = await supabase
      .from('match_results')
      .select(`
        *,
        play_date:play_dates (*)
      `)
      .eq('player_id', playerId)
      .order('play_date', { ascending: false })
      .limit(limit)

    if (response.error) {
      throw new Error(`Failed to fetch player performance trends: ${response.error.message}`)
    }

    return response.data?.map(result => ({
      playDate: result.play_date as PlayDate,
      matchResult: result
    })) || []
  } catch (error) {
    console.error('Error fetching player performance trends:', error)
    throw error
  }
}