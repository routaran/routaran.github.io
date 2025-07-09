/**
 * Round-robin match scheduling for doubles pickleball tournaments
 * Ensures each partnership plays against every other partnership exactly once
 */

import { Partnership } from './partnerships';

export interface Match {
  id: string;
  partnership1: Partnership;
  partnership2: Partnership;
  round: number;
  court?: number;
}

export interface Round {
  number: number;
  matches: Match[];
  byePartnership?: Partnership;
}

/**
 * Generate round-robin schedule where each partnership plays every other partnership once
 * 
 * @param partnerships Array of all partnerships
 * @returns Array of rounds with matches
 */
export function generateRoundRobinSchedule(partnerships: Partnership[]): Round[] {
  const rounds: Round[] = [];
  const matches: Match[] = [];
  
  // Generate all possible matches
  for (let i = 0; i < partnerships.length; i++) {
    for (let j = i + 1; j < partnerships.length; j++) {
      const partnership1 = partnerships[i];
      const partnership2 = partnerships[j];
      
      // Check if partnerships share a player (invalid match)
      if (hasSharedPlayer(partnership1, partnership2)) {
        continue;
      }
      
      matches.push({
        id: `${partnership1.id}-vs-${partnership2.id}`,
        partnership1,
        partnership2,
        round: 0, // Will be assigned later
      });
    }
  }
  
  // Organize matches into rounds
  const scheduledMatches = new Set<string>();
  let roundNumber = 1;
  
  while (scheduledMatches.size < matches.length) {
    const round: Round = {
      number: roundNumber,
      matches: []
    };
    
    const partnershipsInRound = new Set<string>();
    
    for (const match of matches) {
      if (scheduledMatches.has(match.id)) continue;
      
      // Check if either partnership is already playing this round
      const p1Players = [match.partnership1.player1.id, match.partnership1.player2.id];
      const p2Players = [match.partnership2.player1.id, match.partnership2.player2.id];
      const allPlayers = [...p1Players, ...p2Players];
      
      const hasConflict = allPlayers.some(playerId => partnershipsInRound.has(playerId));
      
      if (!hasConflict) {
        match.round = roundNumber;
        round.matches.push(match);
        scheduledMatches.add(match.id);
        allPlayers.forEach(playerId => partnershipsInRound.add(playerId));
      }
    }
    
    // Handle bye for odd number of players (not partnerships)
    const playersInRound = partnershipsInRound.size;
    const totalPlayers = new Set<string>();
    partnerships.forEach(p => {
      totalPlayers.add(p.player1.id);
      totalPlayers.add(p.player2.id);
    });
    
    // If odd number of total players and not all are playing, assign bye
    if (totalPlayers.size % 2 === 1 && playersInRound < totalPlayers.size) {
      // Find a partnership with a player not playing this round
      const byePartnership = partnerships.find(p => {
        const p1Playing = partnershipsInRound.has(p.player1.id);
        const p2Playing = partnershipsInRound.has(p.player2.id);
        return !p1Playing && !p2Playing;
      });
      
      if (byePartnership) {
        round.byePartnership = byePartnership;
      }
    }
    
    if (round.matches.length > 0) {
      rounds.push(round);
      roundNumber++;
    } else {
      // No more matches can be scheduled
      break;
    }
  }
  
  return rounds;
}

/**
 * Check if two partnerships share a player
 * 
 * @param p1 First partnership
 * @param p2 Second partnership
 * @returns true if they share a player
 */
function hasSharedPlayer(p1: Partnership, p2: Partnership): boolean {
  const p1Players = new Set([p1.player1.id, p1.player2.id]);
  const p2Players = [p2.player1.id, p2.player2.id];
  
  return p2Players.some(playerId => p1Players.has(playerId));
}

/**
 * Get partnerships actively playing in a round
 * 
 * @param allPartnerships All partnerships
 * @param matches Matches in the round
 * @returns Active partnerships
 */
function getActivePartnerships(
  allPartnerships: Partnership[], 
  matches: Match[]
): Partnership[] {
  const activeIds = new Set<string>();
  
  matches.forEach(match => {
    activeIds.add(match.partnership1.id);
    activeIds.add(match.partnership2.id);
  });
  
  return allPartnerships.filter(p => activeIds.has(p.id));
}

/**
 * Validate round-robin schedule completeness
 * 
 * @param partnerships All partnerships
 * @param rounds Generated rounds
 * @returns true if schedule is complete and valid
 */
export function validateSchedule(
  partnerships: Partnership[], 
  rounds: Round[]
): boolean {
  const matchupMap = new Map<string, Set<string>>();
  
  // Initialize matchup tracking
  partnerships.forEach(p => {
    matchupMap.set(p.id, new Set<string>());
  });
  
  // Track all matchups
  rounds.forEach(round => {
    round.matches.forEach(match => {
      const p1Id = match.partnership1.id;
      const p2Id = match.partnership2.id;
      
      matchupMap.get(p1Id)?.add(p2Id);
      matchupMap.get(p2Id)?.add(p1Id);
    });
  });
  
  // Verify each partnership plays appropriate opponents
  for (const [partnershipId, opponents] of matchupMap) {
    const partnership = partnerships.find(p => p.id === partnershipId);
    if (!partnership) continue;
    
    // Count expected opponents (all partnerships that don't share a player)
    const expectedOpponents = partnerships.filter(p => 
      p.id !== partnershipId && !hasSharedPlayer(partnership, p)
    );
    
    if (opponents.size !== expectedOpponents.length) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get matches for a specific partnership
 * 
 * @param rounds All rounds
 * @param partnershipId Partnership ID
 * @returns Array of matches involving the partnership
 */
export function getMatchesForPartnership(
  rounds: Round[], 
  partnershipId: string
): Match[] {
  const matches: Match[] = [];
  
  rounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.partnership1.id === partnershipId || 
          match.partnership2.id === partnershipId) {
        matches.push(match);
      }
    });
  });
  
  return matches;
}

/**
 * Calculate total rounds needed for tournament
 * 
 * @param playerCount Number of players
 * @returns Estimated number of rounds
 */
export function calculateRoundCount(playerCount: number): number {
  // For n players, there are C(n,2) partnerships
  const partnershipCount = (playerCount * (playerCount - 1)) / 2;
  
  // Each partnership needs to play against non-overlapping partnerships
  // This is a complex calculation, but approximation works for scheduling
  const avgMatchesPerPartnership = Math.floor(partnershipCount * 0.6);
  const matchesPerRound = Math.floor(playerCount / 4) * 2;
  
  return Math.ceil(avgMatchesPerPartnership / matchesPerRound);
}