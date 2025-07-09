import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useScoreEntry } from '../useScoreEntry';
import type { Match } from '../../types/database';

// Mock dependencies
vi.mock('../useToast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

vi.mock('../../lib/supabase/scores', () => ({
  updateMatchScore: vi.fn(),
  canUpdateMatchScore: vi.fn(),
  validateScoreUpdate: vi.fn(),
}));

vi.mock('../../lib/validation/scoreValidation', () => ({
  validateMatchScore: vi.fn(),
  determineWinner: vi.fn(),
  getCommonScores: vi.fn(),
  DEFAULT_SCORE_CONFIG: {
    winCondition: 'first-to-target',
    targetScore: 11,
    minScore: 0,
    maxScore: 21,
  },
}));

const mockMatch: Match = {
  id: 'match-1',
  play_date_id: 'playdate-1',
  partnership1_id: 'partnership-1',
  partnership2_id: 'partnership-2',
  team1_score: null,
  team2_score: null,
  court_number: 1,
  round_number: 1,
  scheduled_at: null,
  version: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  updated_by: null,
};

describe('useScoreEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { canUpdateMatchScore, validateScoreUpdate } = require('../../lib/supabase/scores');
    const { validateMatchScore, determineWinner } = require('../../lib/validation/scoreValidation');
    
    canUpdateMatchScore.mockResolvedValue({ canUpdate: true });
    validateScoreUpdate.mockReturnValue({ isValid: true, errors: [], warnings: [] });
    validateMatchScore.mockReturnValue({ isValid: true, errors: [], warnings: [] });
    determineWinner.mockReturnValue(null);
  });

  const defaultProps = {
    match: mockMatch,
    playDateId: 'playdate-1',
    winCondition: 'first-to-target' as const,
    targetScore: 11,
  };

  it('initializes with match scores', () => {
    const matchWithScores = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    };

    const { result } = renderHook(() => useScoreEntry({
      ...defaultProps,
      match: matchWithScores,
    }));

    expect(result.current.team1Score).toBe(11);
    expect(result.current.team2Score).toBe(9);
  });

  it('initializes with zero scores when match has no scores', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    expect(result.current.team1Score).toBe(0);
    expect(result.current.team2Score).toBe(0);
  });

  it('updates team1Score', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
    });

    expect(result.current.team1Score).toBe(11);
  });

  it('updates team2Score', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam2Score(9);
    });

    expect(result.current.team2Score).toBe(9);
  });

  it('constrains scores to valid range', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(-5);
    });
    expect(result.current.team1Score).toBe(0);

    act(() => {
      result.current.setTeam1Score(35);
    });
    expect(result.current.team1Score).toBe(0);

    act(() => {
      result.current.setTeam1Score(15);
    });
    expect(result.current.team1Score).toBe(15);
  });

  it('sets both scores at once', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(11, 9);
    });

    expect(result.current.team1Score).toBe(11);
    expect(result.current.team2Score).toBe(9);
  });

  it('detects changes correctly', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    expect(result.current.hasChanges).toBe(false);

    act(() => {
      result.current.setTeam1Score(11);
    });

    expect(result.current.hasChanges).toBe(true);
  });

  it('resets to original scores', () => {
    const matchWithScores = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    };

    const { result } = renderHook(() => useScoreEntry({
      ...defaultProps,
      match: matchWithScores,
    }));

    act(() => {
      result.current.setTeam1Score(15);
    });

    expect(result.current.team1Score).toBe(15);
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetScore();
    });

    expect(result.current.team1Score).toBe(11);
    expect(result.current.hasChanges).toBe(false);
  });

  it('validates scores on change', async () => {
    const { validateScoreUpdate } = require('../../lib/supabase/scores');
    validateScoreUpdate.mockReturnValue({
      isValid: false,
      errors: ['Invalid score'],
      warnings: [],
    });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.errors).toContain('Invalid score');
    expect(result.current.isValid).toBe(false);
  });

  it('submits score successfully', async () => {
    const { updateMatchScore } = require('../../lib/supabase/scores');
    const { useToast } = require('../useToast');
    const mockShowToast = vi.fn();
    const mockOnScoreUpdated = vi.fn();
    const mockOnClose = vi.fn();

    useToast.mockReturnValue({ showToast: mockShowToast });
    updateMatchScore.mockResolvedValue({
      match: { ...mockMatch, team1_score: 11, team2_score: 9 },
      warnings: [],
    });

    const { result } = renderHook(() => useScoreEntry({
      ...defaultProps,
      onScoreUpdated: mockOnScoreUpdated,
      onClose: mockOnClose,
    }));

    act(() => {
      result.current.setTeam1Score(11);
      result.current.setTeam2Score(9);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).toHaveBeenCalledWith(
      {
        matchId: 'match-1',
        team1Score: 11,
        team2Score: 9,
        currentVersion: 1,
        playDateId: 'playdate-1',
      },
      expect.any(Object)
    );

    expect(mockShowToast).toHaveBeenCalledWith({
      title: 'Score Updated',
      description: 'Match score has been saved successfully',
      variant: 'success',
    });

    expect(mockOnScoreUpdated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles submission errors', async () => {
    const { updateMatchScore } = require('../../lib/supabase/scores');
    const { useToast } = require('../useToast');
    const mockShowToast = vi.fn();

    useToast.mockReturnValue({ showToast: mockShowToast });
    updateMatchScore.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
      result.current.setTeam2Score(9);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      title: 'Update Failed',
      description: 'Update failed',
      variant: 'destructive',
    });
  });

  it('prevents submission when invalid', async () => {
    const { updateMatchScore } = require('../../lib/supabase/scores');
    const { validateScoreUpdate } = require('../../lib/supabase/scores');
    
    validateScoreUpdate.mockReturnValue({
      isValid: false,
      errors: ['Invalid score'],
      warnings: [],
    });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).not.toHaveBeenCalled();
  });

  it('prevents submission when cannot edit', async () => {
    const { canUpdateMatchScore, updateMatchScore } = require('../../lib/supabase/scores');
    canUpdateMatchScore.mockResolvedValue({ canUpdate: false });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    // Wait for permission check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.setTeam1Score(11);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).not.toHaveBeenCalled();
  });

  it('applies common score', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.applyCommonScore({ team1: 11, team2: 0 });
    });

    expect(result.current.team1Score).toBe(11);
    expect(result.current.team2Score).toBe(0);
  });

  it('shows warnings on successful submission', async () => {
    const { updateMatchScore } = require('../../lib/supabase/scores');
    const { useToast } = require('../useToast');
    const mockShowToast = vi.fn();

    useToast.mockReturnValue({ showToast: mockShowToast });
    updateMatchScore.mockResolvedValue({
      match: { ...mockMatch, team1_score: 11, team2_score: 9 },
      warnings: ['Score of 25 is unusually high'],
    });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
      result.current.setTeam2Score(9);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      title: 'Score Updated',
      description: 'Score saved with warnings: Score of 25 is unusually high',
      variant: 'warning',
    });
  });

  it('determines winner correctly', () => {
    const { determineWinner } = require('../../lib/validation/scoreValidation');
    determineWinner.mockReturnValue(1);

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
      result.current.setTeam2Score(9);
    });

    expect(result.current.winner).toBe(1);
  });

  it('handles isSubmitting state', async () => {
    const { updateMatchScore } = require('../../lib/supabase/scores');
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    updateMatchScore.mockReturnValue(promise);

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(11);
      result.current.setTeam2Score(9);
    });

    // Start submission
    act(() => {
      result.current.submitScore();
    });

    expect(result.current.isSubmitting).toBe(true);

    // Complete submission
    await act(async () => {
      resolvePromise({
        match: { ...mockMatch, team1_score: 11, team2_score: 9 },
        warnings: [],
      });
      await promise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});