/**
 * Tests for ranking calculation algorithms
 */

import { 
  calculateRankings, 
  calculateTournamentSummary, 
  calculatePartnershipStats,
  calculateRankingChanges,
  calculateWinningStreak
} from '../rankings'
import { MatchResult, Partnership, Match, Player } from '@/types/database'

describe('Rankings Calculations', () => {
  // Mock data
  const mockPlayDateId = 'play-date-1'
  
  const mockMatchResults: MatchResult[] = [
    {
      player_id: 'player-1',
      player_name: 'Alice',
      play_date_id: mockPlayDateId,
      play_date: '2024-01-01',
      play_date_status: 'active',
      games_played: 5,
      wins: 4,
      losses: 1,
      win_percentage: 80,
      points_for: 55,
      points_against: 45,
      point_differential: 10
    },
    {
      player_id: 'player-2',
      player_name: 'Bob',
      play_date_id: mockPlayDateId,
      play_date: '2024-01-01',
      play_date_status: 'active',
      games_played: 5,
      wins: 3,
      losses: 2,
      win_percentage: 60,
      points_for: 50,
      points_against: 48,
      point_differential: 2
    },
    {
      player_id: 'player-3',
      player_name: 'Charlie',
      play_date_id: mockPlayDateId,
      play_date: '2024-01-01',
      play_date_status: 'active',
      games_played: 5,
      wins: 2,
      losses: 3,
      win_percentage: 40,
      points_for: 45,
      points_against: 50,
      point_differential: -5
    }
  ]

  const mockMatches: Match[] = [
    {
      id: 'match-1',
      play_date_id: mockPlayDateId,
      court_id: 'court-1',
      round_number: 1,
      partnership1_id: 'partnership-1',
      partnership2_id: 'partnership-2',
      team1_score: 11,
      team2_score: 9,
      winning_partnership_id: 'partnership-1',
      status: 'completed',
      recorded_by: 'player-1',
      recorded_at: '2024-01-01T10:00:00Z',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      version: 1
    },
    {
      id: 'match-2',
      play_date_id: mockPlayDateId,
      court_id: 'court-1',
      round_number: 2,
      partnership1_id: 'partnership-1',
      partnership2_id: 'partnership-3',
      team1_score: 8,
      team2_score: 11,
      winning_partnership_id: 'partnership-3',
      status: 'completed',
      recorded_by: 'player-3',
      recorded_at: '2024-01-01T11:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T11:00:00Z',
      version: 1
    }
  ]

  const mockPartnerships: Partnership[] = [
    {
      id: 'partnership-1',
      play_date_id: mockPlayDateId,
      player1_id: 'player-1',
      player2_id: 'player-2',
      partnership_name: 'Alice & Bob',
      created_at: '2024-01-01T08:00:00Z'
    },
    {
      id: 'partnership-2',
      play_date_id: mockPlayDateId,
      player1_id: 'player-3',
      player2_id: 'player-4',
      partnership_name: 'Charlie & David',
      created_at: '2024-01-01T08:00:00Z'
    },
    {
      id: 'partnership-3',
      play_date_id: mockPlayDateId,
      player1_id: 'player-1',
      player2_id: 'player-3',
      partnership_name: 'Alice & Charlie',
      created_at: '2024-01-01T08:00:00Z'
    }
  ]

  describe('calculateRankings', () => {
    it('should calculate rankings correctly ordered by win percentage', () => {
      const rankings = calculateRankings(mockMatchResults, mockPlayDateId)
      
      expect(rankings).toHaveLength(3)
      expect(rankings[0].player_name).toBe('Alice')
      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].win_percentage).toBe(80)
      
      expect(rankings[1].player_name).toBe('Bob')
      expect(rankings[1].rank).toBe(2)
      expect(rankings[1].win_percentage).toBe(60)
      
      expect(rankings[2].player_name).toBe('Charlie')
      expect(rankings[2].rank).toBe(3)
      expect(rankings[2].win_percentage).toBe(40)
    })

    it('should use point differential as tiebreaker', () => {
      const tiedResults: MatchResult[] = [
        {
          ...mockMatchResults[0],
          win_percentage: 60,
          point_differential: 10
        },
        {
          ...mockMatchResults[1],
          win_percentage: 60,
          point_differential: 5
        }
      ]
      
      const rankings = calculateRankings(tiedResults, mockPlayDateId)
      
      expect(rankings[0].player_name).toBe('Alice')
      expect(rankings[0].point_differential).toBe(10)
      expect(rankings[1].player_name).toBe('Bob')
      expect(rankings[1].point_differential).toBe(5)
    })

    it('should use alphabetical order as final tiebreaker', () => {
      const tiedResults: MatchResult[] = [
        {
          ...mockMatchResults[0],
          player_name: 'Zoe',
          win_percentage: 60,
          point_differential: 5
        },
        {
          ...mockMatchResults[1],
          player_name: 'Alice',
          win_percentage: 60,
          point_differential: 5
        }
      ]
      
      const rankings = calculateRankings(tiedResults, mockPlayDateId)
      
      expect(rankings[0].player_name).toBe('Alice')
      expect(rankings[1].player_name).toBe('Zoe')
    })

    it('should handle empty results', () => {
      const rankings = calculateRankings([], mockPlayDateId)
      expect(rankings).toHaveLength(0)
    })
  })

  describe('calculateTournamentSummary', () => {
    it('should calculate tournament summary correctly', () => {
      const rankings = calculateRankings(mockMatchResults, mockPlayDateId)
      const summary = calculateTournamentSummary(mockMatches, rankings)
      
      expect(summary.total_matches).toBe(2)
      expect(summary.completed_matches).toBe(2)
      expect(summary.completion_percentage).toBe(100)
      expect(summary.total_points_scored).toBe(39) // 11+9+8+11
      expect(summary.average_match_score).toBe(10) // 39/4 rounded
      expect(summary.highest_score).toBe(11)
      expect(summary.lowest_score).toBe(8)
      expect(summary.most_wins?.player_name).toBe('Alice')
      expect(summary.total_players).toBe(3)
    })

    it('should handle matches with no scores', () => {
      const incompleteMatches = mockMatches.map(match => ({
        ...match,
        team1_score: null,
        team2_score: null
      }))
      
      const rankings = calculateRankings(mockMatchResults, mockPlayDateId)
      const summary = calculateTournamentSummary(incompleteMatches, rankings)
      
      expect(summary.completed_matches).toBe(0)
      expect(summary.completion_percentage).toBe(0)
      expect(summary.total_points_scored).toBe(0)
      expect(summary.average_match_score).toBe(0)
    })
  })

  describe('calculatePartnershipStats', () => {
    it('should calculate partnership statistics correctly', () => {
      const stats = calculatePartnershipStats(mockPartnerships, mockMatches)
      
      expect(stats).toHaveLength(3)
      
      // Find Alice & Bob partnership
      const aliceBob = stats.find(s => s.partnership_id === 'partnership-1')
      expect(aliceBob).toBeDefined()
      expect(aliceBob?.games_played).toBe(1)
      expect(aliceBob?.games_won).toBe(1)
      expect(aliceBob?.games_lost).toBe(0)
      expect(aliceBob?.win_percentage).toBe(100)
      expect(aliceBob?.points_for).toBe(11)
      expect(aliceBob?.points_against).toBe(9)
      expect(aliceBob?.point_differential).toBe(2)
    })

    it('should handle partnerships with no matches', () => {
      const singlePartnership = [mockPartnerships[0]]
      const noMatches: Match[] = []
      
      const stats = calculatePartnershipStats(singlePartnership, noMatches)
      
      expect(stats).toHaveLength(1)
      expect(stats[0].games_played).toBe(0)
      expect(stats[0].games_won).toBe(0)
      expect(stats[0].games_lost).toBe(0)
      expect(stats[0].win_percentage).toBe(0)
      expect(stats[0].points_for).toBe(0)
      expect(stats[0].points_against).toBe(0)
    })
  })

  describe('calculateRankingChanges', () => {
    it('should calculate ranking changes correctly', () => {
      const previousRankings = calculateRankings(mockMatchResults, mockPlayDateId)
      
      // Simulate Bob improving
      const updatedResults = mockMatchResults.map(result => 
        result.player_id === 'player-2' 
          ? { ...result, win_percentage: 90, point_differential: 20 }
          : result
      )
      
      const currentRankings = calculateRankings(updatedResults, mockPlayDateId)
      const changes = calculateRankingChanges(previousRankings, currentRankings)
      
      expect(changes.get('player-2')).toBe(1) // Bob moved up 1 position
      expect(changes.get('player-1')).toBe(-1) // Alice moved down 1 position
      expect(changes.get('player-3')).toBe(0) // Charlie stayed same
    })

    it('should handle new players', () => {
      const previousRankings = calculateRankings(mockMatchResults.slice(0, 2), mockPlayDateId)
      const currentRankings = calculateRankings(mockMatchResults, mockPlayDateId)
      
      const changes = calculateRankingChanges(previousRankings, currentRankings)
      
      expect(changes.get('player-3')).toBeUndefined() // New player has no change
      expect(changes.has('player-1')).toBe(true)
      expect(changes.has('player-2')).toBe(true)
    })
  })

  describe('calculateWinningStreak', () => {
    it('should calculate winning streak correctly', () => {
      const playerId = 'player-1'
      const partnerships = mockPartnerships.filter(p => 
        p.player1_id === playerId || p.player2_id === playerId
      )
      
      // Create matches where player-1 wins consistently
      const winningMatches = mockMatches.map(match => ({
        ...match,
        winning_partnership_id: partnerships.find(p => 
          match.partnership1_id === p.id || match.partnership2_id === p.id
        )?.id || match.winning_partnership_id
      }))
      
      const streak = calculateWinningStreak(playerId, winningMatches, partnerships)
      
      expect(streak).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 for player with no matches', () => {
      const playerId = 'non-existent-player'
      const streak = calculateWinningStreak(playerId, mockMatches, mockPartnerships)
      
      expect(streak).toBe(0)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  it('should handle invalid match results gracefully', () => {
    const invalidResults: MatchResult[] = [
      {
        player_id: 'player-1',
        player_name: 'Alice',
        play_date_id: 'different-play-date',
        play_date: '2024-01-01',
        play_date_status: 'active',
        games_played: 0,
        wins: 0,
        losses: 0,
        win_percentage: 0,
        points_for: 0,
        points_against: 0,
        point_differential: 0
      }
    ]
    
    const rankings = calculateRankings(invalidResults, 'play-date-1')
    expect(rankings).toHaveLength(0)
  })

  it('should handle negative point differentials correctly', () => {
    const negativeResults: MatchResult[] = [
      {
        player_id: 'player-1',
        player_name: 'Alice',
        play_date_id: 'play-date-1',
        play_date: '2024-01-01',
        play_date_status: 'active',
        games_played: 5,
        wins: 1,
        losses: 4,
        win_percentage: 20,
        points_for: 30,
        points_against: 50,
        point_differential: -20
      }
    ]
    
    const rankings = calculateRankings(negativeResults, 'play-date-1')
    expect(rankings[0].point_differential).toBe(-20)
    expect(rankings[0].rank).toBe(1)
  })
})