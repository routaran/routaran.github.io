/**
 * Rankings calculation algorithms for pickleball tournaments
 * 
 * Implements the official ranking system:
 * 1. Primary: Games won percentage (wins ÷ total games)
 * 2. Tiebreaker 1: Point differential (points for - points against)
 * 3. Tiebreaker 2: Head-to-head record (if available)
 * 4. Tiebreaker 3: Total points scored
 * 5. Final: Alphabetical by name
 */

import { MatchResult, Player, Partnership, Match } from '@/types/database'

export interface PlayerRanking {
  player_id: string
  player_name: string
  rank: number
  games_played: number
  games_won: number
  games_lost: number
  win_percentage: number
  points_for: number
  points_against: number
  point_differential: number
  total_points: number
  head_to_head_record?: HeadToHeadRecord[]
}

export interface HeadToHeadRecord {
  opponent_id: string
  opponent_name: string
  wins: number
  losses: number
  points_for: number
  points_against: number
}

export interface TournamentSummary {
  total_matches: number
  completed_matches: number
  completion_percentage: number
  total_points_scored: number
  average_match_score: number
  highest_score: number
  lowest_score: number
  most_wins: PlayerRanking | null
  best_point_differential: PlayerRanking | null
  total_players: number
  total_partnerships: number
}

export interface PartnershipStats {
  partnership_id: string
  player1_name: string
  player2_name: string
  games_played: number
  games_won: number
  games_lost: number
  win_percentage: number
  points_for: number
  points_against: number
  point_differential: number
  average_points_per_game: number
}

/**
 * Calculate rankings for all players in a tournament
 * Uses the official ranking algorithm with proper tiebreakers
 */
export function calculateRankings(
  matchResults: MatchResult[], 
  playDateId: string,
  headToHeadData?: { matches: Match[], partnerships: Partnership[] }
): PlayerRanking[] {
  // Filter results for the specific play date
  const playDateResults = matchResults.filter(result => 
    result.play_date_id === playDateId
  )

  // Calculate head-to-head records if data is provided
  const headToHeadRecords = headToHeadData 
    ? calculateHeadToHeadRecords(headToHeadData.matches, headToHeadData.partnerships)
    : new Map<string, HeadToHeadRecord[]>()

  // Convert match results to player rankings
  const rankings: PlayerRanking[] = playDateResults.map(result => ({
    player_id: result.player_id,
    player_name: result.player_name,
    rank: 0, // Will be set after sorting
    games_played: result.games_played,
    games_won: result.wins,
    games_lost: result.losses,
    win_percentage: result.win_percentage,
    points_for: result.points_for,
    points_against: result.points_against,
    point_differential: result.point_differential,
    total_points: result.points_for,
    head_to_head_record: headToHeadRecords.get(result.player_id)
  }))

  // Sort by ranking algorithm
  rankings.sort((a, b) => {
    // Primary: Win percentage (higher is better)
    if (a.win_percentage !== b.win_percentage) {
      return b.win_percentage - a.win_percentage
    }

    // Tiebreaker 1: Point differential (higher is better)
    if (a.point_differential !== b.point_differential) {
      return b.point_differential - a.point_differential
    }

    // Tiebreaker 2: Head-to-head record (if both players have played each other)
    if (a.head_to_head_record && b.head_to_head_record) {
      const aVsB = a.head_to_head_record.find(record => record.opponent_id === b.player_id)
      const bVsA = b.head_to_head_record.find(record => record.opponent_id === a.player_id)
      
      if (aVsB && bVsA) {
        const aHeadToHeadWins = aVsB.wins
        const bHeadToHeadWins = bVsA.wins
        
        if (aHeadToHeadWins !== bHeadToHeadWins) {
          return bHeadToHeadWins - aHeadToHeadWins
        }
      }
    }

    // Tiebreaker 3: Total points scored (higher is better)
    if (a.total_points !== b.total_points) {
      return b.total_points - a.total_points
    }

    // Final tiebreaker: Alphabetical by name
    return a.player_name.localeCompare(b.player_name)
  })

  // Assign ranks, handling ties properly
  let currentRank = 1
  rankings.forEach((ranking, index) => {
    if (index > 0) {
      const previous = rankings[index - 1]
      
      // Check if this player is tied with the previous player
      if (
        ranking.win_percentage === previous.win_percentage &&
        ranking.point_differential === previous.point_differential &&
        ranking.total_points === previous.total_points
      ) {
        // Tied - use the same rank
        ranking.rank = previous.rank
      } else {
        // Not tied - use the next available rank
        ranking.rank = index + 1
        currentRank = index + 1
      }
    } else {
      ranking.rank = 1
    }
  })

  return rankings
}

/**
 * Calculate head-to-head records between all players
 */
function calculateHeadToHeadRecords(
  matches: Match[], 
  partnerships: Partnership[]
): Map<string, HeadToHeadRecord[]> {
  const records = new Map<string, HeadToHeadRecord[]>()
  
  // Create partnership lookup
  const partnershipLookup = new Map<string, Partnership>()
  partnerships.forEach(partnership => {
    partnershipLookup.set(partnership.id, partnership)
  })

  // Process each completed match
  matches
    .filter(match => match.team1_score !== null && match.team2_score !== null)
    .forEach(match => {
      const partnership1 = partnershipLookup.get(match.partnership1_id)
      const partnership2 = partnershipLookup.get(match.partnership2_id)
      
      if (!partnership1 || !partnership2) return

      const team1Score = match.team1_score!
      const team2Score = match.team2_score!
      
      const team1Won = team1Score > team2Score
      const team2Won = team2Score > team1Score

      // Update records for all player combinations
      const team1Players = [partnership1.player1_id, partnership1.player2_id]
      const team2Players = [partnership2.player1_id, partnership2.player2_id]

      team1Players.forEach(player1 => {
        team2Players.forEach(player2 => {
          updateHeadToHeadRecord(records, player1, player2, team1Won, team1Score, team2Score)
          updateHeadToHeadRecord(records, player2, player1, team2Won, team2Score, team1Score)
        })
      })
    })

  return records
}

/**
 * Update head-to-head record for a specific player matchup
 */
function updateHeadToHeadRecord(
  records: Map<string, HeadToHeadRecord[]>,
  playerId: string,
  opponentId: string,
  won: boolean,
  pointsFor: number,
  pointsAgainst: number
): void {
  if (!records.has(playerId)) {
    records.set(playerId, [])
  }

  const playerRecords = records.get(playerId)!
  let record = playerRecords.find(r => r.opponent_id === opponentId)

  if (!record) {
    record = {
      opponent_id: opponentId,
      opponent_name: '', // Will be filled in later
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0
    }
    playerRecords.push(record)
  }

  if (won) {
    record.wins++
  } else {
    record.losses++
  }

  record.points_for += pointsFor
  record.points_against += pointsAgainst
}

/**
 * Calculate tournament summary statistics
 */
export function calculateTournamentSummary(
  matches: Match[],
  rankings: PlayerRanking[]
): TournamentSummary {
  const completedMatches = matches.filter(match => 
    match.team1_score !== null && match.team2_score !== null
  )

  const totalMatches = matches.length
  const completionPercentage = totalMatches > 0 
    ? Math.round((completedMatches.length / totalMatches) * 100)
    : 0

  const allScores = completedMatches.flatMap(match => [
    match.team1_score!,
    match.team2_score!
  ])

  const totalPointsScored = allScores.reduce((sum, score) => sum + score, 0)
  const averageMatchScore = allScores.length > 0 
    ? Math.round(totalPointsScored / allScores.length)
    : 0

  const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0
  const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0

  const mostWins = rankings.length > 0 
    ? rankings.reduce((prev, current) => 
        prev.games_won > current.games_won ? prev : current
      )
    : null

  const bestPointDifferential = rankings.length > 0
    ? rankings.reduce((prev, current) => 
        prev.point_differential > current.point_differential ? prev : current
      )
    : null

  return {
    total_matches: totalMatches,
    completed_matches: completedMatches.length,
    completion_percentage: completionPercentage,
    total_points_scored: totalPointsScored,
    average_match_score: averageMatchScore,
    highest_score: highestScore,
    lowest_score: lowestScore,
    most_wins: mostWins,
    best_point_differential: bestPointDifferential,
    total_players: rankings.length,
    total_partnerships: 0 // Will be calculated by caller
  }
}

/**
 * Calculate partnership statistics
 */
export function calculatePartnershipStats(
  partnerships: Partnership[],
  matches: Match[]
): PartnershipStats[] {
  return partnerships.map(partnership => {
    const partnershipMatches = matches.filter(match => 
      (match.partnership1_id === partnership.id || match.partnership2_id === partnership.id) &&
      match.team1_score !== null && match.team2_score !== null
    )

    let gamesWon = 0
    let gamesLost = 0
    let pointsFor = 0
    let pointsAgainst = 0

    partnershipMatches.forEach(match => {
      const isTeam1 = match.partnership1_id === partnership.id
      const teamScore = isTeam1 ? match.team1_score! : match.team2_score!
      const opponentScore = isTeam1 ? match.team2_score! : match.team1_score!

      pointsFor += teamScore
      pointsAgainst += opponentScore

      if (teamScore > opponentScore) {
        gamesWon++
      } else {
        gamesLost++
      }
    })

    const gamesPlayed = partnershipMatches.length
    const winPercentage = gamesPlayed > 0 
      ? Math.round((gamesWon / gamesPlayed) * 100)
      : 0
    const pointDifferential = pointsFor - pointsAgainst
    const averagePointsPerGame = gamesPlayed > 0 
      ? Math.round(pointsFor / gamesPlayed)
      : 0

    return {
      partnership_id: partnership.id,
      player1_name: '', // Will be filled in by caller
      player2_name: '', // Will be filled in by caller
      games_played: gamesPlayed,
      games_won: gamesWon,
      games_lost: gamesLost,
      win_percentage: winPercentage,
      points_for: pointsFor,
      points_against: pointsAgainst,
      point_differential: pointDifferential,
      average_points_per_game: averagePointsPerGame
    }
  })
}

/**
 * Calculate ranking changes between two time periods
 */
export function calculateRankingChanges(
  previousRankings: PlayerRanking[],
  currentRankings: PlayerRanking[]
): Map<string, number> {
  const changes = new Map<string, number>()
  
  const previousRankMap = new Map<string, number>()
  previousRankings.forEach(ranking => {
    previousRankMap.set(ranking.player_id, ranking.rank)
  })

  currentRankings.forEach(currentRanking => {
    const previousRank = previousRankMap.get(currentRanking.player_id)
    if (previousRank !== undefined) {
      // Positive change means moved up (lower rank number)
      const change = previousRank - currentRanking.rank
      changes.set(currentRanking.player_id, change)
    }
  })

  return changes
}

/**
 * Check if a player has a winning streak
 */
export function calculateWinningStreak(
  playerId: string,
  matches: Match[],
  partnerships: Partnership[]
): number {
  // Get all matches for partnerships involving this player
  const playerPartnerships = partnerships.filter(p => 
    p.player1_id === playerId || p.player2_id === playerId
  )
  
  const playerMatches = matches
    .filter(match => 
      playerPartnerships.some(p => 
        match.partnership1_id === p.id || match.partnership2_id === p.id
      ) && match.team1_score !== null && match.team2_score !== null
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  let streak = 0
  
  for (const match of playerMatches) {
    const playerPartnership = playerPartnerships.find(p => 
      match.partnership1_id === p.id || match.partnership2_id === p.id
    )!
    
    const isTeam1 = match.partnership1_id === playerPartnership.id
    const teamScore = isTeam1 ? match.team1_score! : match.team2_score!
    const opponentScore = isTeam1 ? match.team2_score! : match.team1_score!
    
    if (teamScore > opponentScore) {
      streak++
    } else {
      break
    }
  }

  return streak
}