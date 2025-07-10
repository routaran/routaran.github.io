/**
 * Bye rotation for tournaments with odd number of players
 * Ensures fair distribution of bye rounds across all partnerships
 */

import type { Partnership } from './partnerships';
import type { Round } from './scheduling';

export interface ByeAssignment {
  partnership: Partnership;
  round: number;
  byeCount: number;
}

/**
 * Assign bye rounds fairly across all partnerships
 * Each partnership should have equal number of byes (±1)
 * 
 * @param partnerships All partnerships
 * @param rounds Tournament rounds
 * @returns Rounds with bye assignments
 */
export function assignByeRounds(
  partnerships: Partnership[], 
  rounds: Round[]
): Round[] {
  const totalPlayers = new Set<string>();
  partnerships.forEach(p => {
    totalPlayers.add(p.player1.id);
    totalPlayers.add(p.player2.id);
  });
  
  // Only assign byes for odd player counts
  if (totalPlayers.size % 2 === 0) {
    return rounds; // Even players, no byes needed
  }
  
  const byeTracking = new Map<string, number>();
  partnerships.forEach(p => byeTracking.set(p.id, 0));
  
  return rounds.map(round => {
    // Find partnerships not playing this round
    const playingPartnerships = new Set<string>();
    round.matches.forEach(match => {
      playingPartnerships.add(match.partnership1.id);
      playingPartnerships.add(match.partnership2.id);
    });
    
    const availableForBye = partnerships.filter(p => 
      !playingPartnerships.has(p.id)
    );
    
    if (availableForBye.length === 0) {
      return round; // All partnerships are playing
    }
    
    // Select partnership with fewest byes
    let selectedPartnership: Partnership | null = null;
    let minByes = Infinity;
    
    availableForBye.forEach(p => {
      const byeCount = byeTracking.get(p.id) || 0;
      if (byeCount < minByes) {
        minByes = byeCount;
        selectedPartnership = p;
      }
    });
    
    if (selectedPartnership) {
      round.byePartnership = selectedPartnership;
      byeTracking.set(selectedPartnership.id, minByes + 1);
    }
    
    return round;
  });
}

/**
 * Validate bye round distribution
 * All partnerships should have equal byes (±1)
 * 
 * @param partnerships All partnerships
 * @param rounds Tournament rounds
 * @returns true if bye distribution is fair
 */
export function validateByeDistribution(
  partnerships: Partnership[], 
  rounds: Round[]
): boolean {
  const byeCounts = new Map<string, number>();
  
  // Initialize counts
  partnerships.forEach(p => byeCounts.set(p.id, 0));
  
  // Count byes
  rounds.forEach(round => {
    if (round.byePartnership) {
      const count = byeCounts.get(round.byePartnership.id) || 0;
      byeCounts.set(round.byePartnership.id, count + 1);
    }
  });
  
  // Check distribution
  const counts = Array.from(byeCounts.values());
  const minByes = Math.min(...counts);
  const maxByes = Math.max(...counts);
  
  // Should differ by at most 1
  return maxByes - minByes <= 1;
}

/**
 * Get bye statistics for all partnerships
 * 
 * @param partnerships All partnerships
 * @param rounds Tournament rounds
 * @returns Map of partnership ID to bye count
 */
export function getByeStatistics(
  partnerships: Partnership[], 
  rounds: Round[]
): Map<string, ByeAssignment[]> {
  const byeAssignments = new Map<string, ByeAssignment[]>();
  
  // Initialize
  partnerships.forEach(p => byeAssignments.set(p.id, []));
  
  // Track assignments
  rounds.forEach((round, index) => {
    if (round.byePartnership) {
      const assignments = byeAssignments.get(round.byePartnership.id) || [];
      assignments.push({
        partnership: round.byePartnership,
        round: round.number,
        byeCount: assignments.length + 1
      });
      byeAssignments.set(round.byePartnership.id, assignments);
    }
  });
  
  return byeAssignments;
}

/**
 * Calculate expected number of bye rounds
 * 
 * @param playerCount Number of players
 * @param roundCount Total rounds
 * @returns Expected byes per partnership
 */
export function calculateExpectedByes(
  playerCount: number, 
  roundCount: number
): number {
  if (playerCount % 2 === 0) {
    return 0; // Even players, no byes
  }
  
  // For odd players, one partnership sits out each round
  const partnershipCount = (playerCount * (playerCount - 1)) / 2;
  const totalByes = roundCount;
  
  return Math.floor(totalByes / partnershipCount);
}

/**
 * Ensure no partnership has consecutive bye rounds
 * 
 * @param rounds Tournament rounds
 * @returns true if no consecutive byes exist
 */
export function validateNoConsecutiveByes(rounds: Round[]): boolean {
  let lastByePartnership: string | null = null;
  
  for (const round of rounds) {
    if (round.byePartnership) {
      if (round.byePartnership.id === lastByePartnership) {
        return false; // Consecutive bye
      }
      lastByePartnership = round.byePartnership.id;
    }
  }
  
  return true;
}

/**
 * Rebalance bye assignments if needed
 * 
 * @param rounds Tournament rounds
 * @param partnerships All partnerships
 * @returns Rebalanced rounds
 */
export function rebalanceByeAssignments(
  rounds: Round[], 
  partnerships: Partnership[]
): Round[] {
  const byeStats = getByeStatistics(partnerships, rounds);
  const byeCounts = new Map<string, number>();
  
  byeStats.forEach((assignments, partnershipId) => {
    byeCounts.set(partnershipId, assignments.length);
  });
  
  // Find min and max
  const counts = Array.from(byeCounts.values());
  const minByes = Math.min(...counts);
  const maxByes = Math.max(...counts);
  
  if (maxByes - minByes <= 1) {
    return rounds; // Already balanced
  }
  
  // Rebalancing logic would go here
  // This is a complex optimization problem
  // For now, return original rounds
  return rounds;
}