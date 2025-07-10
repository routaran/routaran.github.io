/**
 * Court assignment optimization for pickleball tournaments
 * Assigns matches to available courts to minimize wait times
 */

import type { Match, Round } from './scheduling';

export interface Court {
  id: string;
  name: string;
  number: number;
}

export interface CourtAssignment {
  match: Match;
  court: Court;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Assign matches to courts for optimal play flow
 * 
 * @param rounds Tournament rounds
 * @param courts Available courts (max 4)
 * @returns Rounds with court assignments
 */
export function assignCourts(rounds: Round[], courts: Court[]): Round[] {
  if (courts.length === 0) {
    throw new Error('At least one court is required');
  }
  
  if (courts.length > 4) {
    throw new Error('Maximum 4 courts allowed');
  }
  
  return rounds.map(round => {
    const assignedRound = { ...round };
    const matchesPerCourt = Math.ceil(round.matches.length / courts.length);
    
    // Simple round-robin court assignment
    round.matches.forEach((match, index) => {
      const courtIndex = Math.floor(index / matchesPerCourt) % courts.length;
      match.court = courts[courtIndex].number;
    });
    
    return assignedRound;
  });
}

/**
 * Optimize court assignments to minimize player wait times
 * Tries to spread each player's matches across different time slots
 * 
 * @param rounds Tournament rounds
 * @param courts Available courts
 * @returns Optimized rounds with court assignments
 */
export function optimizeCourtAssignments(
  rounds: Round[], 
  courts: Court[]
): Round[] {
  const playerMatchTracking = new Map<string, number[]>();
  
  return rounds.map((round, roundIndex) => {
    const courtAssignments: CourtAssignment[] = [];
    const availableCourts = [...courts];
    const unassignedMatches = [...round.matches];
    
    // First pass: Assign matches with players who haven't played recently
    while (unassignedMatches.length > 0 && availableCourts.length > 0) {
      let bestMatch: Match | null = null;
      let bestScore = -Infinity;
      
      for (const match of unassignedMatches) {
        const score = calculateMatchPriority(match, playerMatchTracking, roundIndex);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = match;
        }
      }
      
      if (bestMatch) {
        const court = availableCourts.shift()!;
        bestMatch.court = court.number;
        
        // Track when players played
        const players = [
          bestMatch.partnership1.player1.id,
          bestMatch.partnership1.player2.id,
          bestMatch.partnership2.player1.id,
          bestMatch.partnership2.player2.id
        ];
        
        players.forEach(playerId => {
          if (!playerMatchTracking.has(playerId)) {
            playerMatchTracking.set(playerId, []);
          }
          playerMatchTracking.get(playerId)!.push(roundIndex);
        });
        
        // Remove from unassigned
        const index = unassignedMatches.indexOf(bestMatch);
        unassignedMatches.splice(index, 1);
      }
    }
    
    // Second pass: Assign remaining matches
    unassignedMatches.forEach((match, index) => {
      match.court = courts[index % courts.length].number;
    });
    
    return round;
  });
}

/**
 * Calculate priority score for match assignment
 * Higher scores indicate matches that should be played sooner
 * 
 * @param match Match to evaluate
 * @param playerTracking Map of player IDs to rounds they've played
 * @param currentRound Current round number
 * @returns Priority score
 */
function calculateMatchPriority(
  match: Match,
  playerTracking: Map<string, number[]>,
  currentRound: number
): number {
  const players = [
    match.partnership1.player1.id,
    match.partnership1.player2.id,
    match.partnership2.player1.id,
    match.partnership2.player2.id
  ];
  
  let totalWaitTime = 0;
  let playersWithHistory = 0;
  
  players.forEach(playerId => {
    const history = playerTracking.get(playerId) || [];
    if (history.length > 0) {
      const lastPlayed = history[history.length - 1];
      totalWaitTime += currentRound - lastPlayed;
      playersWithHistory++;
    }
  });
  
  // Average wait time, with bonus for players who haven't played
  const avgWaitTime = playersWithHistory > 0 
    ? totalWaitTime / playersWithHistory 
    : currentRound + 10; // High priority for players who haven't played
    
  return avgWaitTime;
}

/**
 * Validate court assignments
 * 
 * @param rounds Rounds with court assignments
 * @param maxCourts Maximum number of courts
 * @returns true if assignments are valid
 */
export function validateCourtAssignments(
  rounds: Round[], 
  maxCourts: number
): boolean {
  for (const round of rounds) {
    const courtsUsed = new Set<number>();
    
    for (const match of round.matches) {
      if (match.court === undefined) {
        return false; // Unassigned match
      }
      
      if (match.court < 1 || match.court > maxCourts) {
        return false; // Invalid court number
      }
      
      courtsUsed.add(match.court);
    }
    
    // Ensure courts are used sequentially (1, 2, 3, not 1, 3, 4)
    const courtArray = Array.from(courtsUsed).sort((a, b) => a - b);
    for (let i = 0; i < courtArray.length; i++) {
      if (courtArray[i] !== i + 1) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Get court utilization statistics
 * 
 * @param rounds Rounds with court assignments
 * @param courtCount Total number of courts
 * @returns Utilization stats per court
 */
export function getCourtUtilization(
  rounds: Round[], 
  courtCount: number
): Map<number, number> {
  const utilization = new Map<number, number>();
  
  // Initialize
  for (let i = 1; i <= courtCount; i++) {
    utilization.set(i, 0);
  }
  
  // Count matches per court
  rounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.court) {
        utilization.set(match.court, (utilization.get(match.court) || 0) + 1);
      }
    });
  });
  
  return utilization;
}