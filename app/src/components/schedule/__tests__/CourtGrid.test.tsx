import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CourtGrid } from '../CourtGrid';
import { useAuthStore } from '../../../stores/authStore';

// Mock dependencies
vi.mock('../../../stores/authStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const mockRounds = [
  {
    number: 1,
    matches: [
      {
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
        team1_score: 11,
        team2_score: 9,
      },
      {
        id: 'match2',
        partnership1: {
          id: 'p3',
          player1: { id: 'player5', name: 'Eve' },
          player2: { id: 'player6', name: 'Frank' },
        },
        partnership2: {
          id: 'p4',
          player1: { id: 'player7', name: 'Grace' },
          player2: { id: 'player8', name: 'Henry' },
        },
        round: 1,
        court: 2,
        team1_score: null,
        team2_score: null,
      },
    ],
    byePartnership: null,
  },
  {
    number: 2,
    matches: [
      {
        id: 'match3',
        partnership1: {
          id: 'p1',
          player1: { id: 'player1', name: 'Alice' },
          player2: { id: 'player2', name: 'Bob' },
        },
        partnership2: {
          id: 'p3',
          player1: { id: 'player5', name: 'Eve' },
          player2: { id: 'player6', name: 'Frank' },
        },
        round: 2,
        court: 1,
        team1_score: null,
        team2_score: null,
      },
    ],
    byePartnership: {
      id: 'p2',
      player1: { id: 'player3', name: 'Charlie' },
      player2: { id: 'player4', name: 'David' },
    },
  },
];

const mockCourts = [
  { id: 'court1', number: 1, name: 'Center Court' },
  { id: 'court2', number: 2, name: 'Side Court' },
];

describe('CourtGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      canManagePlayDate: () => false,
    } as any);
  });

  it('renders court grid with matches', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    expect(screen.getByText('Center Court')).toBeInTheDocument();
    expect(screen.getByText('Side Court')).toBeInTheDocument();
    expect(screen.getByText('Alice & Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie & David')).toBeInTheDocument();
  });

  it('shows round navigation', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('navigates between rounds', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Should show round 1 initially
    expect(screen.getByText('11')).toBeInTheDocument(); // Score from round 1

    // Navigate to next round
    fireEvent.click(screen.getByText('Next'));

    // Should show round 2 content
    expect(screen.queryByText('11')).not.toBeInTheDocument();
    expect(screen.getByText('Alice & Bob')).toBeInTheDocument(); // Different match
  });

  it('disables navigation at boundaries', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Previous button should be disabled on round 1
    expect(screen.getByText('Previous')).toBeDisabled();

    // Navigate to last round
    fireEvent.click(screen.getByText('Next'));

    // Next button should be disabled on last round
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('shows current round indicator', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays bye partnership', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={2}
        courts={mockCourts}
      />
    );

    // Navigate to round 2 which has a bye
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Bye Round')).toBeInTheDocument();
    expect(screen.getByText('Charlie & David')).toBeInTheDocument();
  });

  it('shows completed matches with scores', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Match 1 is completed
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows active matches for current round', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Should show active badge for matches in current round
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('handles empty courts gracefully', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={[{
          number: 1,
          matches: [],
          byePartnership: null,
        }]}
        currentRound={1}
        courts={mockCourts}
      />
    );

    expect(screen.getByText('No match assigned')).toBeInTheDocument();
  });

  it('uses default court names when no custom names provided', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={[]}
      />
    );

    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();
  });

  it('shows unassigned matches for organizers', () => {
    // Mock user as organizer
    mockUseAuthStore.mockReturnValue({
      canManagePlayDate: () => true,
    } as any);

    const roundsWithUnassigned = [{
      number: 1,
      matches: [
        {
          id: 'unassigned',
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
          court: 0, // Unassigned
          team1_score: null,
          team2_score: null,
        },
      ],
      byePartnership: null,
    }];

    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={roundsWithUnassigned}
        currentRound={1}
        courts={mockCourts}
      />
    );

    expect(screen.getByText('Unassigned Matches')).toBeInTheDocument();
    expect(screen.getByText('Assign court')).toBeInTheDocument();
  });

  it('allows round selection via dropdown', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Open dropdown
    const select = screen.getByDisplayValue('1');
    fireEvent.click(select);

    // Should show options for all rounds
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Round 2')).toBeInTheDocument();
  });

  it('highlights winning team in completed matches', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Alice & Bob won 11-9, so their section should be highlighted
    const aliceBobSection = screen.getByText('Alice & Bob').closest('div');
    expect(aliceBobSection).toHaveClass('bg-success/10');
  });

  it('handles no data gracefully', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={[]}
        currentRound={null}
        courts={[]}
      />
    );

    expect(screen.getByText('No round data available')).toBeInTheDocument();
  });

  it('maintains correct court assignments', () => {
    render(
      <CourtGrid
        playDateId="play-date-1"
        rounds={mockRounds}
        currentRound={1}
        courts={mockCourts}
      />
    );

    // Match 1 should be on Center Court
    const centerCourtCard = screen.getByText('Center Court').closest('div');
    expect(centerCourtCard).toHaveTextContent('Alice & Bob');
    expect(centerCourtCard).toHaveTextContent('Charlie & David');

    // Match 2 should be on Side Court
    const sideCourtCard = screen.getByText('Side Court').closest('div');
    expect(sideCourtCard).toHaveTextContent('Eve & Frank');
    expect(sideCourtCard).toHaveTextContent('Grace & Henry');
  });
});