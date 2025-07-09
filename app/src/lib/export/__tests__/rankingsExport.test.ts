/**
 * Tests for rankings export functionality
 */

import {
  exportRankingsToCSV,
  exportRankingsToJSON,
  exportPlayerStatsToCSV,
  exportPartnershipStatsToCSV,
  generateExportFilename,
  validateExportData,
  getExportStats
} from '../rankingsExport'
import { PlayerRanking, TournamentSummary, PartnershipStats } from '@/lib/calculations/rankings'
import { PlayerStatistics } from '@/hooks/usePlayerStats'
import { PlayDate } from '@/types/database'

// Mock data
const mockPlayDate: PlayDate = {
  id: 'play-date-1',
  date: '2024-01-15',
  organizer_id: 'user-1',
  num_courts: 2,
  win_condition: 'first_to_target',
  target_score: 11,
  status: 'active',
  schedule_locked: false,
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-01-15T08:00:00Z',
  version: 1
}

const mockRankings: PlayerRanking[] = [
  {
    player_id: 'player-1',
    player_name: 'Alice Johnson',
    rank: 1,
    games_played: 5,
    games_won: 4,
    games_lost: 1,
    win_percentage: 80,
    points_for: 55,
    points_against: 45,
    point_differential: 10,
    total_points: 55
  },
  {
    player_id: 'player-2',
    player_name: 'Bob Smith',
    rank: 2,
    games_played: 5,
    games_won: 3,
    games_lost: 2,
    win_percentage: 60,
    points_for: 50,
    points_against: 48,
    point_differential: 2,
    total_points: 50
  }
]

const mockTournamentSummary: TournamentSummary = {
  total_matches: 10,
  completed_matches: 8,
  completion_percentage: 80,
  total_points_scored: 200,
  average_match_score: 10,
  highest_score: 15,
  lowest_score: 5,
  most_wins: mockRankings[0],
  best_point_differential: mockRankings[0],
  total_players: 2,
  total_partnerships: 3
}

const mockPartnershipStats: PartnershipStats[] = [
  {
    partnership_id: 'partnership-1',
    player1_name: 'Alice Johnson',
    player2_name: 'Bob Smith',
    games_played: 3,
    games_won: 2,
    games_lost: 1,
    win_percentage: 67,
    points_for: 33,
    points_against: 30,
    point_differential: 3,
    average_points_per_game: 11
  }
]

const mockPlayerStats: PlayerStatistics = {
  currentStats: {
    player_id: 'player-1',
    player_name: 'Alice Johnson',
    play_date_id: 'play-date-1',
    play_date: '2024-01-15',
    play_date_status: 'active',
    games_played: 5,
    wins: 4,
    losses: 1,
    win_percentage: 80,
    points_for: 55,
    points_against: 45,
    point_differential: 10
  },
  currentRank: 1,
  historicalStats: [],
  totalTournaments: 5,
  averageWinPercentage: 75,
  bestWinPercentage: 90,
  worstWinPercentage: 60,
  partnershipStats: mockPartnershipStats,
  bestPartnership: mockPartnershipStats[0],
  currentWinningStreak: 3,
  longestWinningStreak: 5,
  averagePointsPerGame: 11,
  bestPointDifferential: 15,
  consistencyRating: 85,
  improvementTrend: 'improving'
}

describe('Rankings Export', () => {
  describe('exportRankingsToCSV', () => {
    it('should generate valid CSV with correct headers', () => {
      const csv = exportRankingsToCSV(mockRankings, mockPlayDate)
      
      const lines = csv.split('\n')
      expect(lines[0]).toContain('Rank,Player Name,Games Played,Games Won,Games Lost')
      expect(lines[0]).toContain('Win Percentage,Points For,Points Against,Point Differential')
      
      expect(lines[1]).toContain('1,"Alice Johnson",5,4,1,80,55,45,10')
      expect(lines[2]).toContain('2,"Bob Smith",5,3,2,60,50,48,2')
    })

    it('should include timestamps when requested', () => {
      const csv = exportRankingsToCSV(mockRankings, mockPlayDate, { includeTimestamps: true })
      
      const lines = csv.split('\n')
      expect(lines[0]).toContain('Export Date')
      expect(lines[1]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should handle empty rankings', () => {
      const csv = exportRankingsToCSV([], mockPlayDate)
      
      const lines = csv.split('\n')
      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0]).toContain('Rank,Player Name')
    })

    it('should properly escape player names with commas', () => {
      const rankingsWithCommas: PlayerRanking[] = [
        {
          ...mockRankings[0],
          player_name: 'Johnson, Alice'
        }
      ]
      
      const csv = exportRankingsToCSV(rankingsWithCommas, mockPlayDate)
      expect(csv).toContain('"Johnson, Alice"')
    })
  })

  describe('exportRankingsToJSON', () => {
    it('should generate valid JSON with all required fields', () => {
      const json = exportRankingsToJSON(mockRankings, mockPlayDate, mockTournamentSummary)
      const data = JSON.parse(json)
      
      expect(data).toHaveProperty('playDate')
      expect(data).toHaveProperty('rankings')
      expect(data).toHaveProperty('tournamentSummary')
      expect(data).toHaveProperty('exportedAt')
      expect(data).toHaveProperty('exportOptions')
      
      expect(data.rankings).toHaveLength(2)
      expect(data.rankings[0].player_name).toBe('Alice Johnson')
      expect(data.tournamentSummary.total_players).toBe(2)
    })

    it('should include partnership stats when provided', () => {
      const json = exportRankingsToJSON(
        mockRankings, 
        mockPlayDate, 
        mockTournamentSummary, 
        mockPartnershipStats
      )
      const data = JSON.parse(json)
      
      expect(data).toHaveProperty('partnershipStats')
      expect(data.partnershipStats).toHaveLength(1)
      expect(data.partnershipStats[0].player1_name).toBe('Alice Johnson')
    })

    it('should redact sensitive data when requested', () => {
      const json = exportRankingsToJSON(
        mockRankings, 
        mockPlayDate, 
        mockTournamentSummary, 
        undefined, 
        { includePersonalData: false }
      )
      const data = JSON.parse(json)
      
      expect(data.playDate.organizer_id).toBe('[REDACTED]')
    })
  })

  describe('exportPlayerStatsToCSV', () => {
    it('should generate valid CSV for player statistics', () => {
      const csv = exportPlayerStatsToCSV(mockPlayerStats, 'Alice Johnson')
      
      const lines = csv.split('\n')
      expect(lines[0]).toContain('Player Name,Current Rank,Total Tournaments')
      expect(lines[0]).toContain('Average Win Percentage,Best Win Percentage')
      expect(lines[0]).toContain('Consistency Rating,Improvement Trend')
      
      expect(lines[1]).toContain('"Alice Johnson",1,5,75,90,60')
      expect(lines[1]).toContain('85,improving')
    })

    it('should handle null current rank', () => {
      const statsWithoutRank = { ...mockPlayerStats, currentRank: null }
      const csv = exportPlayerStatsToCSV(statsWithoutRank, 'Alice Johnson')
      
      expect(csv).toContain('N/A')
    })
  })

  describe('exportPartnershipStatsToCSV', () => {
    it('should generate valid CSV for partnership statistics', () => {
      const csv = exportPartnershipStatsToCSV(mockPartnershipStats)
      
      const lines = csv.split('\n')
      expect(lines[0]).toContain('Player 1,Player 2,Games Played,Games Won')
      expect(lines[0]).toContain('Win Percentage,Points For,Points Against')
      
      expect(lines[1]).toContain('"Alice Johnson","Bob Smith",3,2,1,67,33,30,3,11')
    })

    it('should handle empty partnership stats', () => {
      const csv = exportPartnershipStatsToCSV([])
      
      const lines = csv.split('\n')
      expect(lines).toHaveLength(1) // Only headers
    })
  })

  describe('generateExportFilename', () => {
    it('should generate correct filename for rankings', () => {
      const filename = generateExportFilename(mockPlayDate, 'rankings', 'csv')
      
      expect(filename).toMatch(/^pickleball-rankings-2024-01-15-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('should generate correct filename for player stats', () => {
      const filename = generateExportFilename(mockPlayDate, 'player-stats', 'json', 'Alice Johnson')
      
      expect(filename).toMatch(/^pickleball-player-stats-2024-01-15-alice-johnson-\d{4}-\d{2}-\d{2}\.json$/)
    })

    it('should sanitize player names in filename', () => {
      const filename = generateExportFilename(mockPlayDate, 'player-stats', 'csv', 'Alice & Bob!')
      
      expect(filename).toContain('alice---bob-')
      expect(filename).not.toContain('&')
      expect(filename).not.toContain('!')
    })
  })

  describe('validateExportData', () => {
    it('should validate correct data successfully', () => {
      const validation = validateExportData(mockRankings, mockPlayDate)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect empty rankings', () => {
      const validation = validateExportData([], mockPlayDate)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('No rankings data to export')
    })

    it('should detect invalid play date', () => {
      const invalidPlayDate = { ...mockPlayDate, id: '' }
      const validation = validateExportData(mockRankings, invalidPlayDate)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invalid play date data')
    })

    it('should detect duplicate ranks', () => {
      const duplicateRanks = mockRankings.map(r => ({ ...r, rank: 1 }))
      const validation = validateExportData(duplicateRanks, mockPlayDate)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Duplicate ranks found in rankings data')
    })

    it('should detect negative values', () => {
      const negativeValues = [
        { ...mockRankings[0], games_played: -1 }
      ]
      const validation = validateExportData(negativeValues, mockPlayDate)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invalid negative values found in rankings data')
    })
  })

  describe('getExportStats', () => {
    it('should calculate export statistics correctly', () => {
      const stats = getExportStats(mockRankings)
      
      expect(stats.totalPlayers).toBe(2)
      expect(stats.totalGames).toBe(10) // 5 + 5
      expect(stats.totalPoints).toBe(105) // 55 + 50
      expect(stats.averageWinPercentage).toBe(70) // (80 + 60) / 2
    })

    it('should handle empty rankings', () => {
      const stats = getExportStats([])
      
      expect(stats.totalPlayers).toBe(0)
      expect(stats.totalGames).toBe(0)
      expect(stats.totalPoints).toBe(0)
      expect(stats.averageWinPercentage).toBe(0)
    })

    it('should handle single player', () => {
      const stats = getExportStats([mockRankings[0]])
      
      expect(stats.totalPlayers).toBe(1)
      expect(stats.totalGames).toBe(5)
      expect(stats.totalPoints).toBe(55)
      expect(stats.averageWinPercentage).toBe(80)
    })
  })
})

describe('Export Integration', () => {
  // Mock DOM methods for download tests
  const mockCreateElement = jest.fn()
  const mockClick = jest.fn()
  const mockCreateObjectURL = jest.fn()
  const mockRevokeObjectURL = jest.fn()

  beforeEach(() => {
    const mockElement = {
      click: mockClick,
      href: '',
      download: ''
    }
    
    mockCreateElement.mockReturnValue(mockElement)
    
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true
    })
    
    Object.defineProperty(document.body, 'appendChild', {
      value: jest.fn(),
      writable: true
    })
    
    Object.defineProperty(document.body, 'removeChild', {
      value: jest.fn(),
      writable: true
    })
    
    Object.defineProperty(URL, 'createObjectURL', {
      value: mockCreateObjectURL,
      writable: true
    })
    
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: mockRevokeObjectURL,
      writable: true
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should handle CSV export format correctly', () => {
    const csv = exportRankingsToCSV(mockRankings, mockPlayDate)
    
    // Check CSV format
    const lines = csv.split('\n')
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0].split(',').length).toBeGreaterThan(5)
    
    // Check data integrity
    expect(csv).toContain('Alice Johnson')
    expect(csv).toContain('Bob Smith')
    expect(csv).toContain('80') // Win percentage
    expect(csv).toContain('60') // Win percentage
  })

  it('should handle JSON export format correctly', () => {
    const json = exportRankingsToJSON(mockRankings, mockPlayDate, mockTournamentSummary)
    
    // Should be valid JSON
    expect(() => JSON.parse(json)).not.toThrow()
    
    const data = JSON.parse(json)
    expect(data.rankings).toHaveLength(2)
    expect(data.tournamentSummary.total_players).toBe(2)
  })
})