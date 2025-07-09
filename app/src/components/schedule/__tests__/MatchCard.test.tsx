import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MatchCard } from '../MatchCard';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../hooks/useToast';
import { db } from '../../../lib/supabase';

// Mock dependencies
vi.mock('../../../stores/authStore');
vi.mock('../../../hooks/useToast');
vi.mock('../../../lib/supabase');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockDb = db as jest.Mocked<typeof db>;

const mockMatch = {
  id: 'match1',
  partnership1: {
    id: 'p1',
    player1: { id: 'player1', name: 'Alice' },
    player2: { id: 'player2', name: 'Bob' },
  },
  partnership2: {
    id: 'p2',
    player1: { id: 'player3', name: 'Charlie' },
    player2: { id: 'player4', name: 'David' },
  },
  round: 1,
  court: 1,
  team1_score: null,
  team2_score: null,
  version: 0,
};

describe('MatchCard', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      player: null,
      canUpdateScore: () => false,
    } as any);
    
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  it('renders match with no scores', () => {
    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    expect(screen.getByText('Alice & Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie & David')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
  });

  it('renders completed match with scores', () => {
    const completedMatch = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    };

    render(
      <MatchCard
        match={completedMatch}
        playDateId="play-date-1"
        isCurrentRound={false}
      />
    );

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    
    // Winner should have trophy icon
    const team1Section = screen.getByText('Alice & Bob').closest('div');
    expect(team1Section?.querySelector('svg')).toBeInTheDocument();
  });

  it('shows court name when provided', () => {
    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
        courtName="Center Court"
      />
    );

    expect(screen.getByText('Center Court')).toBeInTheDocument();
  });

  it('highlights match when player is participating', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    const { container } = render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    expect(container.firstChild).toHaveClass('ring-1', 'ring-primary/20');
  });

  it('shows edit button for authorized users', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('enters edit mode when edit button clicked', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('saves score successfully', async () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    mockDb.updateMatchScore.mockResolvedValue({
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    } as any);

    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Update scores
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '11' } });
    fireEvent.change(inputs[1], { target: { value: '9' } });

    // Save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockDb.updateMatchScore).toHaveBeenCalledWith(
        'match1',
        11,
        9,
        0
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      title: 'Score Updated',
      description: 'Match score has been saved successfully.',
      variant: 'success',
    });
  });

  it('handles save error', async () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    mockDb.updateMatchScore.mockRejectedValue(new Error('Network error'));

    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
    });
  });

  it('cancels edit mode', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    const matchWithScore = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    };

    render(
      <MatchCard
        match={matchWithScore}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Change values
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '15' } });

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should revert to original values
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('disables edit button during save', async () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      canUpdateScore: () => true,
    } as any);

    // Mock a slow save
    mockDb.updateMatchScore.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <MatchCard
        match={mockMatch}
        playDateId="play-date-1"
        isCurrentRound={true}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Save
    fireEvent.click(screen.getByText('Save'));

    // Buttons should be disabled
    expect(screen.getByText('Save')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();

    await waitFor(() => {
      expect(mockDb.updateMatchScore).toHaveBeenCalled();
    });
  });

  it('handles tie scores correctly', () => {
    const tieMatch = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 11,
    };

    render(
      <MatchCard
        match={tieMatch}
        playDateId="play-date-1"
        isCurrentRound={false}
      />
    );

    // Neither team should have trophy icon
    const trophies = screen.queryAllByTestId('trophy-icon');
    expect(trophies).toHaveLength(0);
  });
});