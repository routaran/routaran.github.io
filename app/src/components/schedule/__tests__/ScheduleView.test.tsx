import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScheduleView } from '../ScheduleView';
import { useSchedule } from '../../../hooks/useSchedule';
import { useAuthStore } from '../../../stores/authStore';

// Mock dependencies
vi.mock('../../../hooks/useSchedule');
vi.mock('../../../stores/authStore');

const mockUseSchedule = useSchedule as jest.MockedFunction<typeof useSchedule>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const mockRounds = [
  {
    number: 1,
    matches: [
      {
        id: 'match-1',
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
    ],
    byePartnership: null,
  },
  {
    number: 2,
    matches: [
      {
        id: 'match-2',
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
        court: 2,
        team1_score: null,
        team2_score: null,
      },
    ],
    byePartnership: {
      id: 'p4',
      player1: { id: 'player3', name: 'Charlie' },
      player2: { id: 'player4', name: 'David' },
    },
  },
];

describe('ScheduleView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      player: null,
      isAuthenticated: () => false,
      canUpdateScore: () => false,
    } as any);
  });

  it('renders loading state', () => {
    mockUseSchedule.mockReturnValue({
      rounds: null,
      currentRound: null,
      courts: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseSchedule.mockReturnValue({
      rounds: null,
      currentRound: null,
      courts: [],
      isLoading: false,
      error: new Error('Failed to load schedule'),
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByText(/Error loading schedule/)).toBeInTheDocument();
  });

  it('renders empty state when no rounds', () => {
    mockUseSchedule.mockReturnValue({
      rounds: [],
      currentRound: null,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByText('No schedule generated yet')).toBeInTheDocument();
  });

  it('renders schedule with rounds', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByText('Tournament Schedule')).toBeInTheDocument();
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    expect(screen.getByText('Round 2')).toBeInTheDocument();
  });

  it('shows current round indicator', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByText('Round 2 of 2')).toBeInTheDocument();
  });

  it('expands and collapses rounds', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    // Round 2 should be auto-expanded (current round)
    expect(screen.getByText('Eve & Frank')).toBeInTheDocument();
    
    // Click to collapse
    const round2Button = screen.getByText('Round 2').closest('div');
    fireEvent.click(round2Button!);
    
    // Should be collapsed
    expect(screen.queryByText('Eve & Frank')).not.toBeInTheDocument();
  });

  it('shows view selector for authenticated users', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      isAuthenticated: () => true,
      canUpdateScore: () => false,
    } as any);

    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    expect(screen.getByText('Full Schedule')).toBeInTheDocument();
    expect(screen.getByText('My Schedule')).toBeInTheDocument();
    expect(screen.getByText('Court View')).toBeInTheDocument();
  });

  it('switches to player view', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      isAuthenticated: () => true,
      canUpdateScore: () => false,
    } as any);

    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    fireEvent.click(screen.getByText('My Schedule'));
    
    expect(screen.getByText('Your Tournament Stats')).toBeInTheDocument();
  });

  it('switches to court view', () => {
    mockUseAuthStore.mockReturnValue({
      player: { id: 'player1', name: 'Alice' },
      isAuthenticated: () => true,
      canUpdateScore: () => false,
    } as any);

    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    fireEvent.click(screen.getByText('Court View'));
    
    expect(screen.getByText('Court 1')).toBeInTheDocument();
  });

  it('expands all rounds', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    fireEvent.click(screen.getByText('Expand All'));
    
    // Both rounds should be visible
    expect(screen.getByText('Alice & Bob')).toBeInTheDocument();
    expect(screen.getByText('Eve & Frank')).toBeInTheDocument();
  });

  it('collapses all rounds', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    // Expand all first
    fireEvent.click(screen.getByText('Expand All'));
    
    // Then collapse all
    fireEvent.click(screen.getByText('Collapse All'));
    
    // No match details should be visible
    expect(screen.queryByText('Alice & Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Eve & Frank')).not.toBeInTheDocument();
  });

  it('shows correct round status badges', () => {
    mockUseSchedule.mockReturnValue({
      rounds: mockRounds,
      currentRound: 2,
      courts: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ScheduleView playDateId="test-play-date" />);
    
    // Round 1 should be completed
    const round1Section = screen.getByText('Round 1').closest('.card');
    expect(round1Section).toHaveTextContent('Completed');
    
    // Round 2 should be current
    const round2Section = screen.getByText('Round 2').closest('.card');
    expect(round2Section).toHaveTextContent('Current');
  });
});