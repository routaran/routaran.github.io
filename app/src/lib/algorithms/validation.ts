/**
 * Validation utilities for tournament scheduling
 * Ensures all constraints and requirements are met
 */

import type { Player, Partnership } from "./partnerships";
import { validatePartnerships } from "./partnerships";
import type { Round, Match } from "./scheduling";
import { validateSchedule } from "./scheduling";
import { validateCourtAssignments } from "./courtAssignment";
import {
  validateByeDistribution,
  validateNoConsecutiveByes,
} from "./byeRotation";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate complete tournament setup
 *
 * @param players Tournament players
 * @param partnerships Generated partnerships
 * @param rounds Scheduled rounds
 * @param courtCount Number of courts
 * @returns Validation result with errors/warnings
 */
export function validateTournament(
  players: Player[],
  partnerships: Partnership[],
  rounds: Round[],
  courtCount: number
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate player count
  if (players.length < 4) {
    result.errors.push("Minimum 4 players required");
    result.isValid = false;
  }

  if (players.length > 16) {
    result.errors.push("Maximum 16 players allowed");
    result.isValid = false;
  }

  // Validate unique player names and emails
  const names = new Set<string>();
  const emails = new Set<string>();

  for (const player of players) {
    if (names.has(player.name)) {
      result.errors.push(`Duplicate player name: ${player.name}`);
      result.isValid = false;
    }
    names.add(player.name);

    if (emails.has(player.email)) {
      result.errors.push(`Duplicate email: ${player.email}`);
      result.isValid = false;
    }
    emails.add(player.email);
  }

  // Validate partnerships
  if (!validatePartnerships(players, partnerships)) {
    result.errors.push("Invalid partnership generation");
    result.isValid = false;
  }

  // Validate schedule completeness
  if (!validateSchedule(partnerships, rounds)) {
    result.errors.push("Incomplete or invalid match schedule");
    result.isValid = false;
  }

  // Validate court assignments
  if (!validateCourtAssignments(rounds, courtCount)) {
    result.errors.push("Invalid court assignments");
    result.isValid = false;
  }

  // Validate bye distribution (if applicable)
  if (players.length % 2 === 1) {
    if (!validateByeDistribution(partnerships, rounds)) {
      result.warnings.push("Uneven bye distribution");
    }

    if (!validateNoConsecutiveByes(rounds)) {
      result.warnings.push("Partnership has consecutive bye rounds");
    }
  }

  // Additional validations
  validateMatchConstraints(rounds, result);
  validateRoundCompleteness(rounds, partnerships, result);

  return result;
}

/**
 * Validate match constraints
 *
 * @param rounds Tournament rounds
 * @param result Validation result to update
 */
function validateMatchConstraints(
  rounds: Round[],
  result: ValidationResult
): void {
  const matchups = new Map<string, Set<string>>();

  rounds.forEach((round) => {
    const playersInRound = new Set<string>();

    round.matches.forEach((match) => {
      // Check for duplicate matchups
      const key = [match.partnership1.id, match.partnership2.id]
        .sort()
        .join("-");
      const reverseKey = [match.partnership2.id, match.partnership1.id]
        .sort()
        .join("-");

      if (matchups.has(key) || matchups.has(reverseKey)) {
        result.errors.push(
          `Duplicate matchup: ${match.partnership1.id} vs ${match.partnership2.id}`
        );
        result.isValid = false;
      }
      matchups.set(
        key,
        new Set([match.partnership1.id, match.partnership2.id])
      );

      // Check players not playing twice in same round
      const players = [
        match.partnership1.player1.id,
        match.partnership1.player2.id,
        match.partnership2.player1.id,
        match.partnership2.player2.id,
      ];

      players.forEach((playerId) => {
        if (playersInRound.has(playerId)) {
          result.errors.push(
            `Player ${playerId} scheduled twice in round ${round.number}`
          );
          result.isValid = false;
        }
        playersInRound.add(playerId);
      });
    });
  });
}

/**
 * Validate round completeness
 *
 * @param rounds Tournament rounds
 * @param partnerships All partnerships
 * @param result Validation result to update
 */
function validateRoundCompleteness(
  rounds: Round[],
  partnerships: Partnership[],
  result: ValidationResult
): void {
  // Track matches per partnership
  const matchCounts = new Map<string, number>();
  partnerships.forEach((p) => matchCounts.set(p.id, 0));

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      matchCounts.set(
        match.partnership1.id,
        (matchCounts.get(match.partnership1.id) || 0) + 1
      );
      matchCounts.set(
        match.partnership2.id,
        (matchCounts.get(match.partnership2.id) || 0) + 1
      );
    });

    if (round.byePartnership) {
      // Bye counts as sitting out, not as a match
      // But track it for completeness
    }
  });

  // Check if all partnerships have reasonable match counts
  const counts = Array.from(matchCounts.values());
  const minMatches = Math.min(...counts);
  const maxMatches = Math.max(...counts);

  if (maxMatches - minMatches > 2) {
    result.warnings.push(
      `Uneven match distribution: ${minMatches}-${maxMatches} matches per partnership`
    );
  }
}

/**
 * Validate a single match
 *
 * @param match Match to validate
 * @returns true if valid
 */
export function validateMatch(match: Match): boolean {
  // Partnerships must be different
  if (match.partnership1.id === match.partnership2.id) {
    return false;
  }

  // No shared players between partnerships
  const p1Players = new Set([
    match.partnership1.player1.id,
    match.partnership1.player2.id,
  ]);

  const p2Players = [
    match.partnership2.player1.id,
    match.partnership2.player2.id,
  ];

  return !p2Players.some((id) => p1Players.has(id));
}

/**
 * Get tournament statistics
 *
 * @param players Players
 * @param partnerships Partnerships
 * @param rounds Rounds
 * @returns Tournament stats
 */
export function getTournamentStats(
  players: Player[],
  partnerships: Partnership[],
  rounds: Round[]
): {
  playerCount: number;
  partnershipCount: number;
  totalMatches: number;
  roundCount: number;
  matchesPerPartnership: Map<string, number>;
  courtsUsed: Set<number>;
} {
  const matchesPerPartnership = new Map<string, number>();
  partnerships.forEach((p) => matchesPerPartnership.set(p.id, 0));

  let totalMatches = 0;
  const courtsUsed = new Set<number>();

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      totalMatches++;
      matchesPerPartnership.set(
        match.partnership1.id,
        (matchesPerPartnership.get(match.partnership1.id) || 0) + 1
      );
      matchesPerPartnership.set(
        match.partnership2.id,
        (matchesPerPartnership.get(match.partnership2.id) || 0) + 1
      );

      if (match.court) {
        courtsUsed.add(match.court);
      }
    });
  });

  return {
    playerCount: players.length,
    partnershipCount: partnerships.length,
    totalMatches,
    roundCount: rounds.length,
    matchesPerPartnership,
    courtsUsed,
  };
}
