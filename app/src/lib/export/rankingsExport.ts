/**
 * Rankings export functionality
 * 
 * Provides CSV and JSON export capabilities for tournament rankings,
 * player statistics, and tournament summaries
 */

import type { PlayerRanking, TournamentSummary, PartnershipStats } from '@/lib/calculations/rankings'
import type { PlayerStatistics } from '@/hooks/usePlayerStats'
import type { PlayDate } from '@/types/database'

export interface ExportOptions {
  includePersonalData?: boolean
  includeTimestamps?: boolean
  format?: 'csv' | 'json'
  filename?: string
}

export interface RankingsExportData {
  playDate: PlayDate
  rankings: PlayerRanking[]
  tournamentSummary: TournamentSummary
  partnershipStats?: PartnershipStats[]
  exportedAt: string
  exportOptions: ExportOptions
}

/**
 * Export rankings data to CSV format
 */
export function exportRankingsToCSV(
  rankings: PlayerRanking[],
  playDate: PlayDate,
  options: ExportOptions = {}
): string {
  const headers = [
    'Rank',
    'Player Name',
    'Games Played',
    'Games Won',
    'Games Lost',
    'Win Percentage',
    'Points For',
    'Points Against',
    'Point Differential'
  ]

  if (options.includeTimestamps) {
    headers.push('Export Date')
  }

  const csvRows = [
    headers.join(','),
    ...rankings.map(player => {
      const row = [
        player.rank.toString(),
        `"${player.player_name}"`,
        player.games_played.toString(),
        player.games_won.toString(),
        player.games_lost.toString(),
        player.win_percentage.toString(),
        player.points_for.toString(),
        player.points_against.toString(),
        player.point_differential.toString()
      ]

      if (options.includeTimestamps) {
        row.push(new Date().toISOString())
      }

      return row.join(',')
    })
  ]

  return csvRows.join('\n')
}

/**
 * Export rankings data to JSON format
 */
export function exportRankingsToJSON(
  rankings: PlayerRanking[],
  playDate: PlayDate,
  tournamentSummary: TournamentSummary,
  partnershipStats?: PartnershipStats[],
  options: ExportOptions = {}
): string {
  const exportData: RankingsExportData = {
    playDate: {
      ...playDate,
      // Remove sensitive data if requested
      ...(options.includePersonalData === false && {
        organizer_id: '[REDACTED]'
      })
    },
    rankings: rankings.map(player => ({
      ...player,
      // Remove head-to-head data to keep export clean
      head_to_head_record: undefined
    })),
    tournamentSummary,
    partnershipStats,
    exportedAt: new Date().toISOString(),
    exportOptions: options
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Export player statistics to CSV format
 */
export function exportPlayerStatsToCSV(
  playerStats: PlayerStatistics,
  playerName: string,
  options: ExportOptions = {}
): string {
  const headers = [
    'Player Name',
    'Current Rank',
    'Total Tournaments',
    'Average Win Percentage',
    'Best Win Percentage',
    'Worst Win Percentage',
    'Average Points Per Game',
    'Best Point Differential',
    'Consistency Rating',
    'Improvement Trend',
    'Current Win Streak'
  ]

  if (options.includeTimestamps) {
    headers.push('Export Date')
  }

  const row = [
    `"${playerName}"`,
    playerStats.currentRank?.toString() || 'N/A',
    playerStats.totalTournaments.toString(),
    playerStats.averageWinPercentage.toString(),
    playerStats.bestWinPercentage.toString(),
    playerStats.worstWinPercentage.toString(),
    playerStats.averagePointsPerGame.toString(),
    playerStats.bestPointDifferential.toString(),
    playerStats.consistencyRating.toString(),
    playerStats.improvementTrend,
    playerStats.currentWinningStreak.toString()
  ]

  if (options.includeTimestamps) {
    row.push(new Date().toISOString())
  }

  return [headers.join(','), row.join(',')].join('\n')
}

/**
 * Export partnership statistics to CSV format
 */
export function exportPartnershipStatsToCSV(
  partnershipStats: PartnershipStats[],
  options: ExportOptions = {}
): string {
  const headers = [
    'Player 1',
    'Player 2',
    'Games Played',
    'Games Won',
    'Games Lost',
    'Win Percentage',
    'Points For',
    'Points Against',
    'Point Differential',
    'Average Points Per Game'
  ]

  if (options.includeTimestamps) {
    headers.push('Export Date')
  }

  const csvRows = [
    headers.join(','),
    ...partnershipStats.map(partnership => {
      const row = [
        `"${partnership.player1_name}"`,
        `"${partnership.player2_name}"`,
        partnership.games_played.toString(),
        partnership.games_won.toString(),
        partnership.games_lost.toString(),
        partnership.win_percentage.toString(),
        partnership.points_for.toString(),
        partnership.points_against.toString(),
        partnership.point_differential.toString(),
        partnership.average_points_per_game.toString()
      ]

      if (options.includeTimestamps) {
        row.push(new Date().toISOString())
      }

      return row.join(',')
    })
  ]

  return csvRows.join('\n')
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  playDate: PlayDate,
  type: 'rankings' | 'player-stats' | 'partnerships' | 'tournament-summary',
  format: 'csv' | 'json',
  playerName?: string
): string {
  const dateStr = new Date(playDate.date).toISOString().split('T')[0]
  const timestamp = new Date().toISOString().split('T')[0]
  
  let filename = `pickleball-${type}-${dateStr}`
  
  if (playerName) {
    const sanitizedName = playerName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    filename += `-${sanitizedName}`
  }
  
  filename += `-${timestamp}.${format}`
  
  return filename
}

/**
 * Download file with given content
 */
export function downloadFile(
  content: string,
  filename: string,
  contentType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export rankings data with automatic download
 */
export async function exportRankingsData(
  rankings: PlayerRanking[],
  playDate: PlayDate,
  tournamentSummary: TournamentSummary,
  partnershipStats?: PartnershipStats[],
  options: ExportOptions = {}
): Promise<void> {
  const format = options.format || 'csv'
  const filename = options.filename || generateExportFilename(playDate, 'rankings', format)
  
  let content: string
  let contentType: string
  
  if (format === 'csv') {
    content = exportRankingsToCSV(rankings, playDate, options)
    contentType = 'text/csv'
  } else {
    content = exportRankingsToJSON(rankings, playDate, tournamentSummary, partnershipStats, options)
    contentType = 'application/json'
  }
  
  downloadFile(content, filename, contentType)
}

/**
 * Export player statistics with automatic download
 */
export async function exportPlayerStatistics(
  playerStats: PlayerStatistics,
  playerName: string,
  playDate: PlayDate,
  options: ExportOptions = {}
): Promise<void> {
  const format = options.format || 'csv'
  const filename = options.filename || generateExportFilename(playDate, 'player-stats', format, playerName)
  
  let content: string
  let contentType: string
  
  if (format === 'csv') {
    content = exportPlayerStatsToCSV(playerStats, playerName, options)
    contentType = 'text/csv'
  } else {
    content = JSON.stringify({
      playerName,
      playDate,
      statistics: playerStats,
      exportedAt: new Date().toISOString(),
      exportOptions: options
    }, null, 2)
    contentType = 'application/json'
  }
  
  downloadFile(content, filename, contentType)
}

/**
 * Export partnership statistics with automatic download
 */
export async function exportPartnershipStatistics(
  partnershipStats: PartnershipStats[],
  playDate: PlayDate,
  options: ExportOptions = {}
): Promise<void> {
  const format = options.format || 'csv'
  const filename = options.filename || generateExportFilename(playDate, 'partnerships', format)
  
  let content: string
  let contentType: string
  
  if (format === 'csv') {
    content = exportPartnershipStatsToCSV(partnershipStats, options)
    contentType = 'text/csv'
  } else {
    content = JSON.stringify({
      playDate,
      partnershipStats,
      exportedAt: new Date().toISOString(),
      exportOptions: options
    }, null, 2)
    contentType = 'application/json'
  }
  
  downloadFile(content, filename, contentType)
}

/**
 * Export tournament summary with automatic download
 */
export async function exportTournamentSummary(
  tournamentSummary: TournamentSummary,
  playDate: PlayDate,
  options: ExportOptions = {}
): Promise<void> {
  const format = options.format || 'json'
  const filename = options.filename || generateExportFilename(playDate, 'tournament-summary', format)
  
  const content = JSON.stringify({
    playDate,
    tournamentSummary,
    exportedAt: new Date().toISOString(),
    exportOptions: options
  }, null, 2)
  
  downloadFile(content, filename, 'application/json')
}

/**
 * Validate export data before processing
 */
export function validateExportData(
  rankings: PlayerRanking[],
  playDate: PlayDate
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!rankings || rankings.length === 0) {
    errors.push('No rankings data to export')
  }
  
  if (!playDate || !playDate.id) {
    errors.push('Invalid play date data')
  }
  
  // Check for duplicate ranks
  const ranks = rankings.map(r => r.rank)
  const uniqueRanks = new Set(ranks)
  if (ranks.length !== uniqueRanks.size) {
    errors.push('Duplicate ranks found in rankings data')
  }
  
  // Check for negative values
  const hasNegativeValues = rankings.some(r => 
    r.games_played < 0 || r.games_won < 0 || r.games_lost < 0 || 
    r.points_for < 0 || r.points_against < 0
  )
  if (hasNegativeValues) {
    errors.push('Invalid negative values found in rankings data')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get export statistics
 */
export function getExportStats(rankings: PlayerRanking[]): {
  totalPlayers: number
  totalGames: number
  totalPoints: number
  averageWinPercentage: number
} {
  const totalPlayers = rankings.length
  const totalGames = rankings.reduce((sum, r) => sum + r.games_played, 0)
  const totalPoints = rankings.reduce((sum, r) => sum + r.points_for, 0)
  const averageWinPercentage = rankings.length > 0 
    ? Math.round(rankings.reduce((sum, r) => sum + r.win_percentage, 0) / rankings.length)
    : 0
  
  return {
    totalPlayers,
    totalGames,
    totalPoints,
    averageWinPercentage
  }
}