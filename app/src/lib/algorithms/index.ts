/**
 * Tournament scheduling algorithms for Pickleball Tracker
 *
 * This module provides all algorithms needed for:
 * - Partnership generation (all possible doubles pairs)
 * - Round-robin match scheduling
 * - Court assignment optimization
 * - Bye round rotation for odd player counts
 * - Schedule validation
 */

// Re-export all types and functions
export * from "./partnerships";
export * from "./scheduling";
export * from "./courtAssignment";
export * from "./byeRotation";
export * from "./validation";

// Convenience imports for common use cases
import {
  generatePartnerships,
  type Player,
  type Partnership,
} from "./partnerships";
import {
  generateRoundRobinSchedule,
  type Round,
  type Match,
} from "./scheduling";
import {
  assignCourts,
  optimizeCourtAssignments,
  type Court,
} from "./courtAssignment";
import { assignByeRounds } from "./byeRotation";
import { validateTournament, type ValidationResult } from "./validation";

/**
 * Generate a complete tournament schedule
 *
 * @param players Array of players (4-16)
 * @param courts Array of available courts (1-4)
 * @returns Complete tournament schedule with court assignments
 */
export function generateTournament(
  players: Player[],
  courts: Court[]
): {
  partnerships: Partnership[];
  rounds: Round[];
  validation: ValidationResult;
} {
  // Generate partnerships
  const partnerships = generatePartnerships(players);

  // Generate round-robin schedule
  let rounds = generateRoundRobinSchedule(partnerships);

  // Assign bye rounds for odd player counts
  if (players.length % 2 === 1) {
    rounds = assignByeRounds(partnerships, rounds);
  }

  // Assign courts
  rounds = optimizeCourtAssignments(rounds, courts);

  // Validate the complete tournament
  const validation = validateTournament(
    players,
    partnerships,
    rounds,
    courts.length
  );

  return {
    partnerships,
    rounds,
    validation,
  };
}

/**
 * Quick validation check for tournament parameters
 *
 * @param playerCount Number of players
 * @param courtCount Number of courts
 * @returns true if parameters are valid
 */
export function canGenerateTournament(
  playerCount: number,
  courtCount: number
): boolean {
  return (
    playerCount >= 4 && playerCount <= 16 && courtCount >= 1 && courtCount <= 4
  );
}
