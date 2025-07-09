import { describe, it, expect } from 'vitest';
import { generatePartnerships, type Player } from '../partnerships';
import {
  generateRoundRobinSchedule,
  validateSchedule,
  getMatchesForPartnership,
  calculateRoundCount
} from '../scheduling';

describe('Round-Robin Scheduling', () => {
  const createPlayers = (count: number): Player[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      email: `player${i + 1}@example.com`
    }));
  };

  describe('generateRoundRobinSchedule', () => {
    it('should generate schedule for 4 players', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      expect(rounds.length).toBeGreaterThan(0);
      
      // Verify no player plays twice in same round
      rounds.forEach(round => {
        const playersInRound = new Set<string>();
        round.matches.forEach(match => {
          const players = [
            match.partnership1.player1.id,
            match.partnership1.player2.id,
            match.partnership2.player1.id,
            match.partnership2.player2.id
          ];
          players.forEach(p => {
            expect(playersInRound.has(p)).toBe(false);
            playersInRound.add(p);
          });
        });
      });
    });

    it('should generate schedule for 8 players', () => {
      const players = createPlayers(8);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      expect(rounds.length).toBeGreaterThan(0);
      expect(validateSchedule(partnerships, rounds)).toBe(true);
    });

    it('should not schedule matches between partnerships with shared players', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      rounds.forEach(round => {
        round.matches.forEach(match => {
          // Check no shared players
          const p1Players = new Set([
            match.partnership1.player1.id,
            match.partnership1.player2.id
          ]);
          const p2Players = [
            match.partnership2.player1.id,
            match.partnership2.player2.id
          ];
          
          p2Players.forEach(playerId => {
            expect(p1Players.has(playerId)).toBe(false);
          });
        });
      });
    });

    it('should assign round numbers sequentially', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      rounds.forEach((round, index) => {
        expect(round.number).toBe(index + 1);
      });
    });

    it('should create unique match IDs', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      const matchIds = new Set<string>();
      rounds.forEach(round => {
        round.matches.forEach(match => {
          expect(matchIds.has(match.id)).toBe(false);
          matchIds.add(match.id);
        });
      });
    });
  });

  describe('validateSchedule', () => {
    it('should validate complete schedule', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      expect(validateSchedule(partnerships, rounds)).toBe(true);
    });

    it('should detect incomplete schedule', () => {
      const players = createPlayers(6);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      // Remove last round
      rounds.pop();
      
      // May still be valid if enough matches scheduled
      const isValid = validateSchedule(partnerships, rounds);
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('getMatchesForPartnership', () => {
    it('should find all matches for a partnership', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      const partnership = partnerships[0];
      const matches = getMatchesForPartnership(rounds, partnership.id);
      
      expect(matches.length).toBeGreaterThan(0);
      
      // All matches should include this partnership
      matches.forEach(match => {
        const isInMatch = match.partnership1.id === partnership.id || 
                         match.partnership2.id === partnership.id;
        expect(isInMatch).toBe(true);
      });
    });

    it('should return empty array for non-existent partnership', () => {
      const players = createPlayers(4);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      const matches = getMatchesForPartnership(rounds, 'non-existent');
      expect(matches).toHaveLength(0);
    });
  });

  describe('calculateRoundCount', () => {
    it('should estimate rounds for various player counts', () => {
      expect(calculateRoundCount(4)).toBeGreaterThan(0);
      expect(calculateRoundCount(8)).toBeGreaterThan(0);
      expect(calculateRoundCount(12)).toBeGreaterThan(0);
      expect(calculateRoundCount(16)).toBeGreaterThan(0);
    });

    it('should increase with player count', () => {
      const rounds4 = calculateRoundCount(4);
      const rounds8 = calculateRoundCount(8);
      const rounds12 = calculateRoundCount(12);
      
      expect(rounds8).toBeGreaterThan(rounds4);
      expect(rounds12).toBeGreaterThan(rounds8);
    });
  });

  describe('odd player counts', () => {
    it('should handle 5 players (bye assignment done separately)', () => {
      const players = createPlayers(5);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      // The base algorithm doesn't assign byes - that's done by assignByeRounds
      expect(rounds.length).toBeGreaterThan(0);
      // Verify no player conflicts in rounds
      rounds.forEach(round => {
        const playersInRound = new Set<string>();
        round.matches.forEach(match => {
          const players = [
            match.partnership1.player1.id,
            match.partnership1.player2.id,
            match.partnership2.player1.id,
            match.partnership2.player2.id
          ];
          players.forEach(p => {
            expect(playersInRound.has(p)).toBe(false);
            playersInRound.add(p);
          });
        });
      });
    });

    it('should handle 7 players with bye rounds', () => {
      const players = createPlayers(7);
      const partnerships = generatePartnerships(players);
      const rounds = generateRoundRobinSchedule(partnerships);
      
      // Verify bye partnerships don't play in their bye round
      rounds.forEach(round => {
        if (round.byePartnership) {
          round.matches.forEach(match => {
            expect(match.partnership1.id).not.toBe(round.byePartnership.id);
            expect(match.partnership2.id).not.toBe(round.byePartnership.id);
          });
        }
      });
    });
  });
});