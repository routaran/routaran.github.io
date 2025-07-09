import { describe, it, expect } from 'vitest';
import {
  generatePartnerships,
  getPartnership,
  getPartnershipsForPlayer,
  validatePartnerships,
  type Player
} from '../partnerships';

describe('Partnership Generation', () => {
  const createPlayers = (count: number): Player[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      email: `player${i + 1}@example.com`
    }));
  };

  describe('generatePartnerships', () => {
    it('should generate correct number of partnerships for 4 players', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      // C(4,2) = 6 partnerships
      expect(partnerships).toHaveLength(6);
    });

    it('should generate correct number of partnerships for 8 players', () => {
      const players = createPlayers(8);
      const partnerships = generatePartnerships(players);
      
      // C(8,2) = 28 partnerships
      expect(partnerships).toHaveLength(28);
    });

    it('should generate correct number of partnerships for 16 players', () => {
      const players = createPlayers(16);
      const partnerships = generatePartnerships(players);
      
      // C(16,2) = 120 partnerships
      expect(partnerships).toHaveLength(120);
    });

    it('should create unique partnership IDs', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const ids = partnerships.map(p => p.id);
      
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should include each player in correct number of partnerships', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      
      players.forEach(player => {
        const playerPartnerships = partnerships.filter(p =>
          p.player1.id === player.id || p.player2.id === player.id
        );
        // Each player should be in exactly (n-1) partnerships
        expect(playerPartnerships).toHaveLength(5);
      });
    });

    it('should throw error for less than 4 players', () => {
      const players = createPlayers(3);
      expect(() => generatePartnerships(players)).toThrow('Minimum 4 players required');
    });

    it('should throw error for more than 16 players', () => {
      const players = createPlayers(17);
      expect(() => generatePartnerships(players)).toThrow('Maximum 16 players allowed');
    });
  });

  describe('getPartnership', () => {
    it('should find partnership by player IDs', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      const found = getPartnership(partnerships, 'player-1', 'player-2');
      expect(found).toBeDefined();
      expect(found?.player1.id).toBe('player-1');
      expect(found?.player2.id).toBe('player-2');
    });

    it('should find partnership regardless of player order', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      const found1 = getPartnership(partnerships, 'player-1', 'player-2');
      const found2 = getPartnership(partnerships, 'player-2', 'player-1');
      
      expect(found1).toEqual(found2);
    });

    it('should return null for non-existent partnership', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      const found = getPartnership(partnerships, 'player-1', 'player-99');
      expect(found).toBeNull();
    });
  });

  describe('getPartnershipsForPlayer', () => {
    it('should find all partnerships for a player', () => {
      const players = createPlayers(5);
      const partnerships = generatePartnerships(players);
      
      const playerPartnerships = getPartnershipsForPlayer(partnerships, 'player-1');
      
      // Player 1 should be in 4 partnerships (with players 2, 3, 4, 5)
      expect(playerPartnerships).toHaveLength(4);
      
      // All partnerships should include player-1
      playerPartnerships.forEach(p => {
        const hasPlayer = p.player1.id === 'player-1' || p.player2.id === 'player-1';
        expect(hasPlayer).toBe(true);
      });
    });

    it('should return empty array for non-existent player', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      const playerPartnerships = getPartnershipsForPlayer(partnerships, 'player-99');
      expect(playerPartnerships).toHaveLength(0);
    });
  });

  describe('validatePartnerships', () => {
    it('should validate correct partnerships', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      
      expect(validatePartnerships(players, partnerships)).toBe(true);
    });

    it('should detect missing partnerships', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      // Remove one partnership
      partnerships.pop();
      
      expect(validatePartnerships(players, partnerships)).toBe(false);
    });

    it('should detect duplicate partnerships', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      
      // Duplicate first partnership
      partnerships.push(partnerships[0]);
      
      expect(validatePartnerships(players, partnerships)).toBe(false);
    });

    it('should validate for various player counts', () => {
      for (let count = 4; count <= 16; count++) {
        const players = createPlayers(count);
        const partnerships = generatePartnerships(players);
        
        expect(validatePartnerships(players, partnerships)).toBe(true);
      }
    });
  });
});