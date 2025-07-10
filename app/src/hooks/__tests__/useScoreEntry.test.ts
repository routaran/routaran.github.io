import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useScoreEntry } from '../useScoreEntry';
import type { Match } from '../../types/database';
import { updateMatchScore, canUpdateMatchScore, validateScoreUpdate } from '../../lib/supabase/scores';
import { validateMatchScore, determineWinner, getCommonScores } from '../../lib/validation/scoreValidation';

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
    targetScore: 15,
    minWinDifference: 2,
  },
}));

const mockMatch: Match = {
  id: 'match-1',
  play_date_id: 'playdate-1',
  partnership1_id: 'partnership-1',
  partnership2_id: 'partnership-2',
  team1_score: 10,
  team2_score: 8,
  court_number: 1,
  round_number: 1,
  version: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  updated_by: null,
};

describe('useScoreEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(canUpdateMatchScore).mockResolvedValue({ canUpdate: true });
    vi.mocked(validateScoreUpdate).mockReturnValue({ isValid: true, errors: [], warnings: [] });
    vi.mocked(validateMatchScore).mockReturnValue({ isValid: true, errors: [], warnings: [] });
    vi.mocked(determineWinner).mockReturnValue(null);
  });

  const defaultProps = {
    match: mockMatch,
    playDateId: 'playdate-1',
    winCondition: 'first_to_target' as const,
    targetScore: 15,
    onScoreUpdated: vi.fn(),
  };

  it('initializes with match scores', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    expect(result.current.team1Score).toBe(10);
    expect(result.current.team2Score).toBe(8);
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.isValid).toBe(true);
  });

  it('initializes with zero scores when match has no scores', () => {
    const matchWithoutScores = { ...mockMatch, team1_score: null, team2_score: null };
    const { result } = renderHook(() =>
      useScoreEntry({ ...defaultProps, match: matchWithoutScores })
    );

    expect(result.current.team1Score).toBe(0);
    expect(result.current.team2Score).toBe(0);
  });

  it('updates team1Score', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(15);
    });

    expect(result.current.team1Score).toBe(15);
    expect(result.current.hasChanges).toBe(true);
  });

  it('updates team2Score', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam2Score(12);
    });

    expect(result.current.team2Score).toBe(12);
    expect(result.current.hasChanges).toBe(true);
  });

  it('constrains scores to valid range', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(-5);
    });
    expect(result.current.team1Score).toBe(0);

    act(() => {
      result.current.setTeam2Score(100);
    });
    expect(result.current.team2Score).toBe(50);
  });

  it('sets both scores at once', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(11, 9);
    });

    expect(result.current.team1Score).toBe(11);
    expect(result.current.team2Score).toBe(9);
    expect(result.current.hasChanges).toBe(true);
  });

  it('detects changes correctly', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    expect(result.current.hasChanges).toBe(false);

    act(() => {
      result.current.setTeam1Score(11);
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.setTeam1Score(10); // Back to original
    });
    expect(result.current.hasChanges).toBe(false);
  });

  it('resets to original scores', () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(15, 13);
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetScore();
    });

    expect(result.current.team1Score).toBe(10);
    expect(result.current.team2Score).toBe(8);
    expect(result.current.hasChanges).toBe(false);
  });

  it('validates scores on change', () => {
    vi.mocked(validateMatchScore).mockReturnValue({
      isValid: false,
      errors: ['Invalid score'],
      warnings: [],
    });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setTeam1Score(15);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toEqual(['Invalid score']);
  });

  it('submits score successfully', async () => {
    vi.mocked(updateMatchScore).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(15, 10);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).toHaveBeenCalledWith(
      'match-1',
      { team1_score: 15, team2_score: 10 },
      1
    );
    expect(defaultProps.onScoreUpdated).toHaveBeenCalledWith({
      ...mockMatch,
      team1_score: 15,
      team2_score: 10,
    });
  });

  it('handles submission errors', async () => {
    vi.mocked(updateMatchScore).mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(15, 10);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(result.current.errors).toContain('Failed to update score');
  });

  it('prevents submission when invalid', async () => {
    const { result } = renderHook(() => useScoreEntry(defaultProps));

    // Make invalid
    vi.mocked(validateMatchScore).mockReturnValue({
      isValid: false,
      errors: ['Invalid score'],
      warnings: [],
    });

    act(() => {
      result.current.setTeam1Score(15);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).not.toHaveBeenCalled();
  });

  it('prevents submission when cannot edit', async () => {
    vi.mocked(canUpdateMatchScore).mockResolvedValue({ canUpdate: false });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    expect(result.current.canEdit).toBe(false);

    await act(async () => {
      await result.current.submitScore();
    });

    expect(updateMatchScore).not.toHaveBeenCalled();
  });

  it('applies common score', () => {
    vi.mocked(getCommonScores).mockReturnValue([11, 15, 21]);

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.applyCommonScore({ team1: 15, team2: 13 });
    });

    expect(result.current.team1Score).toBe(15);
    expect(result.current.team2Score).toBe(13); // Win by 2
  });

  it('shows warnings on successful submission', async () => {
    vi.mocked(validateScoreUpdate).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Score is unusually high'],
    });
    vi.mocked(updateMatchScore).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(50, 48);
    });

    await act(async () => {
      await result.current.submitScore();
    });

    expect(result.current.warnings).toContain('Score is unusually high');
  });

  it('determines winner correctly', () => {
    vi.mocked(determineWinner).mockReturnValue(1);

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(15, 10);
    });

    expect(result.current.winner).toBe(1);
  });

  it('handles isSubmitting state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    vi.mocked(updateMatchScore).mockReturnValue(promise as any);

    const { result } = renderHook(() => useScoreEntry(defaultProps));

    act(() => {
      result.current.setScores(15, 10);
    });

    expect(result.current.isSubmitting).toBe(false);

    // Start submission
    act(() => {
      result.current.submitScore();
    });

    expect(result.current.isSubmitting).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ success: true });
      await promise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});