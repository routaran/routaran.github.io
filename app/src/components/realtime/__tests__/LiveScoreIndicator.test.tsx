import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LiveScoreIndicator, LiveScoreBadge, LiveScoreGrid } from '../LiveScoreIndicator';
import { useRealtimeSubscription } from '../../../hooks/useRealtimeSubscription';
import { useToast } from '../../../hooks/useToast';
import { TestProvider } from '../../../test/utils';

// Mock dependencies
vi.mock('../../../hooks/useRealtimeSubscription');
vi.mock('../../../hooks/useToast');

const mockUseRealtimeSubscription = useRealtimeSubscription as vi.MockedFunction<typeof useRealtimeSubscription>;
const mockUseToast = useToast as vi.MockedFunction<typeof useToast>;

const mockShowToast = vi.fn();

describe('LiveScoreIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    } as any);
  });

  const mockMatch = {
    id: 'match-123',
    play_date_id: 'play-date-123',
    partnership1_id: 'partnership-1',
    partnership2_id: 'partnership-2',
    team1_score: 15,
    team2_score: 10,
    court_number: 1,
    round_number: 2,
    scheduled_at: null,
    version: 1,
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-01T10:30:00Z',
    updated_by: 'user-123',
  };

  describe('basic rendering', () => {
    it('should render loading state initially', () => {
      mockUseRealtimeSubscription.mockImplementation(() => {});

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      expect(screen.getByText('Loading match...')).toBeInTheDocument();
    });

    it('should render match scores when available', () => {
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        // Simulate initial match data
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: mockMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Court 1 • Round 2')).toBeInTheDocument();
      });
    });

    it('should render compact mode correctly', () => {
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: mockMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" compact={true} />
        </TestProvider>
      );

      waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.queryByText('Court 1 • Round 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('real-time updates', () => {
    it('should show live indicator when receiving updates', async () => {
      let subscriptionCallback: (event: any) => void;
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        subscriptionCallback = callback;
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      // Simulate real-time update
      subscriptionCallback({
        eventType: 'UPDATE',
        new: mockMatch,
        old: null,
      } as any);

      await waitFor(() => {
        expect(screen.getByText('LIVE')).toBeInTheDocument();
      });
    });

    it('should trigger score animations on score changes', async () => {
      let subscriptionCallback: (event: any) => void;
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        subscriptionCallback = callback;
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      // Initial score
      subscriptionCallback({
        eventType: 'UPDATE',
        new: { ...mockMatch, team1_score: 10, team2_score: 8 },
        old: null,
      } as any);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });

      // Score update
      subscriptionCallback({
        eventType: 'UPDATE',
        new: { ...mockMatch, team1_score: 15, team2_score: 10 },
        old: { ...mockMatch, team1_score: 10, team2_score: 8 },
      } as any);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should show notifications when enabled', async () => {
      let subscriptionCallback: (event: any) => void;
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        subscriptionCallback = callback;
      });

      render(
        <TestProvider>
          <LiveScoreIndicator 
            matchId="match-123" 
            showNotifications={true}
          />
        </TestProvider>
      );

      // Initial score
      subscriptionCallback({
        eventType: 'UPDATE',
        new: { ...mockMatch, team1_score: 10, team2_score: 8 },
        old: null,
      } as any);

      // Score update
      subscriptionCallback({
        eventType: 'UPDATE',
        new: { ...mockMatch, team1_score: 15, team2_score: 10 },
        old: { ...mockMatch, team1_score: 10, team2_score: 8 },
      } as any);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Score updated!', 'info');
      });
    });

    it('should call onScoreUpdate callback', async () => {
      const mockOnScoreUpdate = vi.fn();
      let subscriptionCallback: (event: any) => void;
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        subscriptionCallback = callback;
      });

      render(
        <TestProvider>
          <LiveScoreIndicator 
            matchId="match-123" 
            onScoreUpdate={mockOnScoreUpdate}
          />
        </TestProvider>
      );

      subscriptionCallback({
        eventType: 'UPDATE',
        new: mockMatch,
        old: null,
      } as any);

      await waitFor(() => {
        expect(mockOnScoreUpdate).toHaveBeenCalledWith(mockMatch);
      });
    });
  });

  describe('match completion', () => {
    it('should show completion badge for completed matches', async () => {
      const completedMatch = {
        ...mockMatch,
        team1_score: 15,
        team2_score: 10,
      };

      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: completedMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeInTheDocument();
      });
    });

    it('should show winner announcement', async () => {
      const completedMatch = {
        ...mockMatch,
        team1_score: 15,
        team2_score: 10,
      };

      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: completedMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🎉 Team 1 Wins!')).toBeInTheDocument();
      });
    });

    it('should show tie announcement', async () => {
      const tiedMatch = {
        ...mockMatch,
        team1_score: 15,
        team2_score: 15,
      };

      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: tiedMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🤝 It\'s a Tie!')).toBeInTheDocument();
      });
    });
  });

  describe('details view', () => {
    it('should show details when enabled', async () => {
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: mockMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator 
            matchId="match-123" 
            showDetails={true}
          />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Last Update:')).toBeInTheDocument();
        expect(screen.getByText('Version:')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should hide details when disabled', async () => {
      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: mockMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator 
            matchId="match-123" 
            showDetails={false}
          />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Last Update:')).not.toBeInTheDocument();
        expect(screen.queryByText('Version:')).not.toBeInTheDocument();
      });
    });
  });

  describe('score formatting', () => {
    it('should format null scores as dashes', async () => {
      const pendingMatch = {
        ...mockMatch,
        team1_score: null,
        team2_score: null,
      };

      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: pendingMatch,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('-')).toHaveLength(3); // Two score dashes + separator
      });
    });

    it('should format numeric scores correctly', async () => {
      const match = {
        ...mockMatch,
        team1_score: 0,
        team2_score: 21,
      };

      mockUseRealtimeSubscription.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback({
            eventType: 'UPDATE',
            new: match,
            old: null,
          } as any);
        }, 0);
      });

      render(
        <TestProvider>
          <LiveScoreIndicator matchId="match-123" />
        </TestProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('21')).toBeInTheDocument();
      });
    });
  });
});

describe('LiveScoreBadge', () => {
  it('should render compact live score indicator', () => {
    mockUseRealtimeSubscription.mockImplementation(() => {});

    render(
      <TestProvider>
        <LiveScoreBadge matchId="match-123" />
      </TestProvider>
    );

    expect(screen.getByText('Loading match...')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseRealtimeSubscription.mockImplementation(() => {});

    const { container } = render(
      <TestProvider>
        <LiveScoreBadge matchId="match-123" className="custom-class" />
      </TestProvider>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('LiveScoreGrid', () => {
  it('should render multiple live score indicators', () => {
    mockUseRealtimeSubscription.mockImplementation(() => {});

    const matchIds = ['match-1', 'match-2', 'match-3'];

    render(
      <TestProvider>
        <LiveScoreGrid matchIds={matchIds} />
      </TestProvider>
    );

    expect(screen.getAllByText('Loading match...')).toHaveLength(3);
  });

  it('should apply custom className', () => {
    mockUseRealtimeSubscription.mockImplementation(() => {});

    const { container } = render(
      <TestProvider>
        <LiveScoreGrid matchIds={['match-1']} className="custom-grid" />
      </TestProvider>
    );

    expect(container.firstChild).toHaveClass('custom-grid');
  });

  it('should render empty grid for no matches', () => {
    mockUseRealtimeSubscription.mockImplementation(() => {});

    const { container } = render(
      <TestProvider>
        <LiveScoreGrid matchIds={[]} />
      </TestProvider>
    );

    expect(container.firstChild?.children).toHaveLength(0);
  });
});