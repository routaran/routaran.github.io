import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../supabase'
import * as playersApi from '../players'
import type { PlayerInsert } from '../../../types/database'

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockSupabase = vi.mocked(supabase)

describe('players API', () => {
  const mockPlayer = {
    id: 'player-1',
    name: 'John Doe',
    email: 'john@example.com',
    play_date_id: 'play-date-1',
    project_owner: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery as any)
  })

  describe('getPlayers', () => {
    it('fetches all players when no playDateId provided', async () => {
      mockQuery.select.mockReturnValue({
        ...mockQuery,
        data: [mockPlayer],
        error: null,
      })

      const result = await playersApi.getPlayers()

      expect(mockSupabase.from).toHaveBeenCalledWith('players')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.order).toHaveBeenCalledWith('name')
      expect(mockQuery.eq).not.toHaveBeenCalled()
      expect(result).toEqual([mockPlayer])
    })

    it('filters by playDateId when provided', async () => {
      mockQuery.eq.mockReturnValue({
        data: [mockPlayer],
        error: null,
      })

      const result = await playersApi.getPlayers('play-date-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('play_date_id', 'play-date-1')
      expect(result).toEqual([mockPlayer])
    })

    it('throws error when query fails', async () => {
      mockQuery.select.mockReturnValue({
        ...mockQuery,
        data: null,
        error: new Error('Database error'),
      })

      await expect(playersApi.getPlayers()).rejects.toThrow('Database error')
    })
  })

  describe('getPlayerById', () => {
    it('fetches single player by id', async () => {
      mockQuery.single.mockReturnValue({
        data: mockPlayer,
        error: null,
      })

      const result = await playersApi.getPlayerById('player-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'player-1')
      expect(mockQuery.single).toHaveBeenCalled()
      expect(result).toEqual(mockPlayer)
    })
  })

  describe('createPlayer', () => {
    it('creates a new player', async () => {
      const newPlayer: PlayerInsert = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        play_date_id: 'play-date-1',
      }

      mockQuery.single.mockReturnValue({
        data: { ...mockPlayer, ...newPlayer },
        error: null,
      })

      const result = await playersApi.createPlayer(newPlayer)

      expect(mockQuery.insert).toHaveBeenCalledWith(newPlayer)
      expect(mockQuery.select).toHaveBeenCalled()
      expect(result).toEqual({ ...mockPlayer, ...newPlayer })
    })
  })

  describe('createPlayers', () => {
    it('creates multiple players', async () => {
      const newPlayers: PlayerInsert[] = [
        { name: 'Player 1', email: 'p1@example.com', play_date_id: 'play-date-1' },
        { name: 'Player 2', email: 'p2@example.com', play_date_id: 'play-date-1' },
      ]

      mockQuery.select.mockReturnValue({
        data: newPlayers,
        error: null,
      })

      const result = await playersApi.createPlayers(newPlayers)

      expect(mockQuery.insert).toHaveBeenCalledWith(newPlayers)
      expect(result).toEqual(newPlayers)
    })
  })

  describe('updatePlayer', () => {
    it('updates player data', async () => {
      const updateData = { name: 'Updated Name' }
      const updatedPlayer = { ...mockPlayer, ...updateData }

      mockQuery.single.mockReturnValue({
        data: updatedPlayer,
        error: null,
      })

      const result = await playersApi.updatePlayer('player-1', updateData)

      expect(mockQuery.update).toHaveBeenCalledWith(updateData)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'player-1')
      expect(result).toEqual(updatedPlayer)
    })
  })

  describe('deletePlayer', () => {
    it('deletes a player', async () => {
      mockQuery.delete.mockReturnValue({
        error: null,
      })

      await playersApi.deletePlayer('player-1')

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'player-1')
    })
  })

  describe('searchPlayers', () => {
    it('searches players by name', async () => {
      mockQuery.limit.mockReturnValue({
        data: [mockPlayer],
        error: null,
      })

      const result = await playersApi.searchPlayers('John')

      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%John%')
      expect(mockQuery.limit).toHaveBeenCalledWith(20)
      expect(result).toEqual([mockPlayer])
    })

    it('filters by playDateId when provided', async () => {
      mockQuery.limit.mockReturnValue({
        data: [mockPlayer],
        error: null,
      })

      await playersApi.searchPlayers('John', 'play-date-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('play_date_id', 'play-date-1')
    })
  })

  describe('checkPlayerNameExists', () => {
    it('returns true when player name exists', async () => {
      mockQuery.single.mockReturnValue({
        data: mockPlayer,
        error: null,
      })

      const result = await playersApi.checkPlayerNameExists('John Doe', 'play-date-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('name', 'John Doe')
      expect(mockQuery.eq).toHaveBeenCalledWith('play_date_id', 'play-date-1')
      expect(result).toBe(true)
    })

    it('returns false when player name does not exist', async () => {
      mockQuery.single.mockReturnValue({
        data: null,
        error: { code: 'PGRST116' }, // Row not found
      })

      const result = await playersApi.checkPlayerNameExists('Non Existent', 'play-date-1')

      expect(result).toBe(false)
    })

    it('throws error for non-404 database errors', async () => {
      mockQuery.single.mockReturnValue({
        data: null,
        error: new Error('Database error'),
      })

      await expect(
        playersApi.checkPlayerNameExists('John Doe', 'play-date-1')
      ).rejects.toThrow('Database error')
    })
  })

  describe('getProjectOwner', () => {
    it('returns project owner when exists', async () => {
      const projectOwner = { ...mockPlayer, project_owner: true }
      mockQuery.single.mockReturnValue({
        data: projectOwner,
        error: null,
      })

      const result = await playersApi.getProjectOwner()

      expect(mockQuery.eq).toHaveBeenCalledWith('project_owner', true)
      expect(result).toEqual(projectOwner)
    })

    it('returns null when no project owner exists', async () => {
      mockQuery.single.mockReturnValue({
        data: null,
        error: { code: 'PGRST116' }, // Row not found
      })

      const result = await playersApi.getProjectOwner()

      expect(result).toBeNull()
    })
  })
})