import { describe, it, expect } from 'vitest';
import {
  validateScoreValue,
  validateMatchScore,
  validateWinCondition,
  determineWinner,
  isMatchComplete,
  getCommonScores,
  formatScore,
  parseScore,
  DEFAULT_SCORE_CONFIG,
  type ScoreValidationConfig,
} from '../scoreValidation';

describe('scoreValidation', () => {
  const defaultConfig: ScoreValidationConfig = {
    winCondition: 'first-to-target',
    targetScore: 11,
    minScore: 0,
    maxScore: 21,
  };

  const winBy2Config: ScoreValidationConfig = {
    winCondition: 'win-by-2',
    targetScore: 11,
    minScore: 0,
    maxScore: 21,
  };

  describe('validateScoreValue', () => {
    it('validates score within range', () => {
      const result = validateScoreValue(10, defaultConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects score below minimum', () => {
      const result = validateScoreValue(-1, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score cannot be less than 0');
    });

    it('rejects score above maximum', () => {
      const result = validateScoreValue(25, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score cannot be greater than 21');
    });

    it('rejects non-integer scores', () => {
      const result = validateScoreValue(10.5, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score must be a whole number');
    });
  });

  describe('validateWinCondition', () => {
    describe('first-to-target', () => {
      it('validates winner reaching target', () => {
        const result = validateWinCondition(11, 9, defaultConfig);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('rejects winner not reaching target', () => {
        const result = validateWinCondition(10, 9, defaultConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Winning team must reach 11 points');
      });

      it('allows any margin of victory', () => {
        const result = validateWinCondition(11, 10, defaultConfig);
        expect(result.isValid).toBe(true);
      });
    });

    describe('win-by-2', () => {
      it('validates winner reaching target and winning by 2', () => {
        const result = validateWinCondition(11, 9, winBy2Config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('rejects winner not reaching target', () => {
        const result = validateWinCondition(10, 8, winBy2Config);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Winning team must reach 11 points');
      });

      it('rejects winner not winning by 2', () => {
        const result = validateWinCondition(11, 10, winBy2Config);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Winning team must win by at least 2 points');
      });

      it('allows deuce games', () => {
        const result = validateWinCondition(13, 11, winBy2Config);
        expect(result.isValid).toBe(true);
      });
    });

    it('rejects tie games', () => {
      const result = validateWinCondition(11, 11, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Match cannot end in a tie');
    });

    it('warns about unusually high scores', () => {
      const result = validateWinCondition(25, 10, defaultConfig);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Score of 25 is unusually high for target of 11');
    });

    it('warns about large score differences', () => {
      const result = validateWinCondition(21, 5, defaultConfig);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large score difference (16) - please verify scores are correct');
    });
  });

  describe('validateMatchScore', () => {
    it('validates complete valid match', () => {
      const result = validateMatchScore(11, 9, defaultConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('combines individual score validation errors', () => {
      const result = validateMatchScore(-1, 25, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Score cannot be less than 0');
      expect(result.errors).toContain('Score cannot be greater than 21');
    });

    it('validates win condition after individual scores', () => {
      const result = validateMatchScore(10, 9, defaultConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Winning team must reach 11 points');
    });
  });

  describe('determineWinner', () => {
    it('determines team 1 winner', () => {
      expect(determineWinner(11, 9)).toBe(1);
    });

    it('determines team 2 winner', () => {
      expect(determineWinner(9, 11)).toBe(2);
    });

    it('returns null for ties', () => {
      expect(determineWinner(10, 10)).toBe(null);
    });
  });

  describe('isMatchComplete', () => {
    it('returns true for complete match', () => {
      expect(isMatchComplete(11, 9)).toBe(true);
    });

    it('returns false for incomplete match', () => {
      expect(isMatchComplete(null, 9)).toBe(false);
      expect(isMatchComplete(11, null)).toBe(false);
      expect(isMatchComplete(null, null)).toBe(false);
    });

    it('returns false for negative scores', () => {
      expect(isMatchComplete(-1, 9)).toBe(false);
      expect(isMatchComplete(11, -1)).toBe(false);
    });
  });

  describe('getCommonScores', () => {
    it('generates common scores for target 11', () => {
      const scores = getCommonScores(11);
      expect(scores).toHaveLength(7); // 5 basic + 2 win-by-2
      expect(scores[0]).toEqual({ team1: 11, team2: 0, label: '11-0' });
      expect(scores[1]).toEqual({ team1: 11, team2: 1, label: '11-1' });
      expect(scores[4]).toEqual({ team1: 11, team2: 9, label: '11-9' });
    });

    it('generates common scores for target 21', () => {
      const scores = getCommonScores(21);
      expect(scores).toHaveLength(7);
      expect(scores[0]).toEqual({ team1: 21, team2: 0, label: '21-0' });
      expect(scores[5]).toEqual({ team1: 22, team2: 20, label: '22-20' });
    });

    it('skips win-by-2 scores for low targets', () => {
      const scores = getCommonScores(5);
      expect(scores).toHaveLength(5); // Only basic scores
      expect(scores.every(s => s.team1 <= 5)).toBe(true);
    });
  });

  describe('formatScore', () => {
    it('formats number scores', () => {
      expect(formatScore(11)).toBe('11');
      expect(formatScore(0)).toBe('0');
    });

    it('formats null scores', () => {
      expect(formatScore(null)).toBe('-');
    });
  });

  describe('parseScore', () => {
    it('parses valid score strings', () => {
      expect(parseScore('11')).toBe(11);
      expect(parseScore('0')).toBe(0);
    });

    it('returns null for invalid strings', () => {
      expect(parseScore('abc')).toBe(null);
      expect(parseScore('')).toBe(null);
      expect(parseScore('11.5')).toBe(null);
    });
  });

  describe('DEFAULT_SCORE_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_SCORE_CONFIG.winCondition).toBe('first-to-target');
      expect(DEFAULT_SCORE_CONFIG.targetScore).toBe(11);
      expect(DEFAULT_SCORE_CONFIG.minScore).toBe(0);
      expect(DEFAULT_SCORE_CONFIG.maxScore).toBe(21);
    });
  });
});

describe('scoreValidation integration', () => {
  it('validates typical pickleball scores', () => {
    const testCases = [
      { team1: 11, team2: 9, shouldBeValid: true },
      { team1: 11, team2: 0, shouldBeValid: true },
      { team1: 21, team2: 19, shouldBeValid: true },
      { team1: 10, team2: 9, shouldBeValid: false },
      { team1: 11, team2: 11, shouldBeValid: false },
    ];

    testCases.forEach(({ team1, team2, shouldBeValid }) => {
      const result = validateMatchScore(team1, team2, DEFAULT_SCORE_CONFIG);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  it('validates win-by-2 scenarios', () => {
    const config = { ...DEFAULT_SCORE_CONFIG, winCondition: 'win-by-2' as const };
    const testCases = [
      { team1: 11, team2: 9, shouldBeValid: true },
      { team1: 11, team2: 10, shouldBeValid: false },
      { team1: 13, team2: 11, shouldBeValid: true },
      { team1: 15, team2: 13, shouldBeValid: true },
    ];

    testCases.forEach(({ team1, team2, shouldBeValid }) => {
      const result = validateMatchScore(team1, team2, config);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });
});