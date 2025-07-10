import type { WinCondition } from "../../types/database";

export interface ScoreValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScoreValidationConfig {
  winCondition: WinCondition;
  targetScore: number;
  minScore: number;
  maxScore: number;
}

/**
 * Validates individual score values
 */
export function validateScoreValue(
  score: number,
  config: ScoreValidationConfig
): ScoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic range validation
  if (score < config.minScore) {
    errors.push(`Score cannot be less than ${config.minScore}`);
  }

  if (score > config.maxScore) {
    errors.push(`Score cannot be greater than ${config.maxScore}`);
  }

  // Check if score is an integer
  if (!Number.isInteger(score)) {
    errors.push("Score must be a whole number");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a complete match score based on win conditions
 */
export function validateMatchScore(
  team1Score: number,
  team2Score: number,
  config: ScoreValidationConfig
): ScoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate individual scores first
  const team1Validation = validateScoreValue(team1Score, config);
  const team2Validation = validateScoreValue(team2Score, config);

  errors.push(...team1Validation.errors, ...team2Validation.errors);
  warnings.push(...team1Validation.warnings, ...team2Validation.warnings);

  // If individual scores are invalid, don't check win conditions
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Validate win conditions
  const result = validateWinCondition(team1Score, team2Score, config);
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates win conditions based on the configured rules
 */
export function validateWinCondition(
  team1Score: number,
  team2Score: number,
  config: ScoreValidationConfig
): ScoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { winCondition, targetScore } = config;
  const maxScore = Math.max(team1Score, team2Score);
  const minScore = Math.min(team1Score, team2Score);
  const scoreDiff = maxScore - minScore;

  // Check if neither team has won
  if (team1Score === team2Score) {
    errors.push("Match cannot end in a tie");
    return { isValid: false, errors, warnings };
  }

  if (winCondition === "first-to-target") {
    // First-to-target: winner must reach target score
    if (maxScore < targetScore) {
      errors.push(`Winning team must reach ${targetScore} points`);
    }
  } else if (winCondition === "win-by-2") {
    // Win-by-2: winner must reach target and win by at least 2
    if (maxScore < targetScore) {
      errors.push(`Winning team must reach ${targetScore} points`);
    } else if (scoreDiff < 2) {
      errors.push("Winning team must win by at least 2 points");
    }
  }

  // Check for unusually high scores
  if (maxScore > targetScore + 10) {
    warnings.push(
      `Score of ${maxScore} is unusually high for target of ${targetScore}`
    );
  }

  // Check for large score differences (might indicate data entry error)
  if (scoreDiff > 15) {
    warnings.push(
      `Large score difference (${scoreDiff}) - please verify scores are correct`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Determines the winner of a match based on scores
 */
export function determineWinner(
  team1Score: number,
  team2Score: number
): 1 | 2 | null {
  if (team1Score > team2Score) return 1;
  if (team2Score > team1Score) return 2;
  return null;
}

/**
 * Checks if a match is complete (has valid scores for both teams)
 */
export function isMatchComplete(
  team1Score: number | null,
  team2Score: number | null
): boolean {
  return (
    team1Score !== null &&
    team2Score !== null &&
    team1Score >= 0 &&
    team2Score >= 0
  );
}

/**
 * Gets common score suggestions based on target score
 */
export function getCommonScores(
  targetScore: number
): Array<{ team1: number; team2: number; label: string }> {
  const scores = [
    { team1: targetScore, team2: 0, label: `${targetScore}-0` },
    { team1: targetScore, team2: 1, label: `${targetScore}-1` },
    { team1: targetScore, team2: 2, label: `${targetScore}-2` },
    {
      team1: targetScore,
      team2: targetScore - 1,
      label: `${targetScore}-${targetScore - 1}`,
    },
    {
      team1: targetScore,
      team2: targetScore - 2,
      label: `${targetScore}-${targetScore - 2}`,
    },
  ];

  // Add win-by-2 scores if target is high enough
  if (targetScore >= 11) {
    scores.push(
      {
        team1: targetScore + 1,
        team2: targetScore - 1,
        label: `${targetScore + 1}-${targetScore - 1}`,
      },
      {
        team1: targetScore + 2,
        team2: targetScore,
        label: `${targetScore + 2}-${targetScore}`,
      }
    );
  }

  return scores;
}

/**
 * Formats a score for display
 */
export function formatScore(score: number | null): string {
  return score === null ? "-" : score.toString();
}

/**
 * Parses a score string into a number
 */
export function parseScore(scoreStr: string): number | null {
  // Check if the string is a valid integer
  if (!/^\d+$/.test(scoreStr.trim())) {
    return null;
  }

  const parsed = parseInt(scoreStr, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Default validation configuration
 */
export const DEFAULT_SCORE_CONFIG: ScoreValidationConfig = {
  winCondition: "first-to-target",
  targetScore: 11,
  minScore: 0,
  maxScore: 21,
};
