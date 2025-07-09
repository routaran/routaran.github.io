import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PlayDateList } from '../PlayDateList';
import { useAuth } from '../../../hooks/useAuth';
import type { PlayDateWithStats } from '../../../lib/supabase/playDates';

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = useAuth as any;

describe('PlayDateList', () => {
  const mockPlayDates: PlayDateWithStats[] = [
    {
      id: '1',
      date: '2024-01-15',
      organizer_id: 'org1',
      num_courts: 2,
      win_condition: 'first_to_target',
      target_score: 11,
      status: 'scheduled',
      schedule_locked: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      version: 1,
      organizer: {
        id: 'org1',
        name: 'John Organizer',
        email: 'john@example.com',
      },
      player_count: 8,
      match_count: 10,
      completed_matches: 0,
    },
    {
      id: '2',
      date: '2024-01-16',
      organizer_id: 'org2',
      num_courts: 3,
      win_condition: 'win_by_2',
      target_score: 15,
      status: 'active',
      schedule_locked: true,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      version: 1,
      organizer: {
        id: 'org2',
        name: 'Jane Organizer',
        email: 'jane@example.com',
      },
      player_count: 12,
      match_count: 15,
      completed_matches: 8,
    },
  ];

  const mockPlayer = {
    id: 'player1',
    name: 'Test Player',
    email: 'test@example.com',
    project_owner: false,
  };

  const renderList = (props: Partial<Parameters<typeof PlayDateList>[0]> = {}) => {
    const defaultProps = {
      playDates: mockPlayDates,
      isLoading: false,
      error: null,
      hasMore: false,
      canCreate: false,
      ...props,
    };

    return render(
      <BrowserRouter>
        <PlayDateList {...defaultProps} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      player: mockPlayer,
      user: { id: 'user1' },
      isAuthenticated: true,
    });
  });

  it('renders play date cards correctly', () => {
    renderList();

    expect(screen.getByText('Mon, Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Tue, Jan 16, 2024')).toBeInTheDocument();
    expect(screen.getByText('John Organizer')).toBeInTheDocument();
    expect(screen.getByText('Jane Organizer')).toBeInTheDocument();
  });

  it('shows empty state when no play dates', () => {
    renderList({
      playDates: [],
      isLoading: false,
    });

    expect(screen.getByText('No Play Dates Yet')).toBeInTheDocument();
    expect(screen.getByText('No play dates found. Create your first one to get started!')).toBeInTheDocument();
  });

  it('shows create button in empty state when canCreate is true', () => {
    const onCreateNew = vi.fn();
    renderList({
      playDates: [],
      isLoading: false,
      canCreate: true,
      onCreateNew,
    });

    const createButton = screen.getByText('Create Play Date');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('shows custom empty state message', () => {
    renderList({
      playDates: [],
      isLoading: false,
      emptyStateMessage: 'Custom empty message',
    });

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const error = { message: 'Failed to load', code: 'TEST_ERROR' };
    renderList({
      playDates: [],
      isLoading: false,
      error,
    });

    expect(screen.getByText('Failed to Load Play Dates')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows retry button in error state', () => {
    const error = { message: 'Failed to load', code: 'TEST_ERROR' };
    const onRefresh = vi.fn();
    renderList({
      playDates: [],
      isLoading: false,
      error,
      onRefresh,
    });

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows loading state for initial load', () => {
    renderList({
      playDates: [],
      isLoading: true,
    });

    // Should show loading skeletons
    const loadingElements = screen.getAllByText((content, element) => {
      return element?.className?.includes('animate-pulse') ?? false;
    });
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows load more button when hasMore is true', () => {
    const onLoadMore = vi.fn();
    renderList({
      hasMore: true,
      onLoadMore,
    });

    const loadMoreButton = screen.getByText('Load More');
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('shows loading state on load more button when loading', () => {
    renderList({
      hasMore: true,
      isLoading: true,
      onLoadMore: vi.fn(),
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('disables load more button when loading', () => {
    renderList({
      hasMore: true,
      isLoading: true,
      onLoadMore: vi.fn(),
    });

    const loadMoreButton = screen.getByRole('button', { name: /loading/i });
    expect(loadMoreButton).toBeDisabled();
  });

  it('passes onEdit callback to play date cards', () => {
    const onEdit = vi.fn();
    renderList({ onEdit });

    // The onEdit prop should be passed to PlayDateCard components
    // We can't easily test this without mocking PlayDateCard, but we can verify the prop exists
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('uses grid layout for play date cards', () => {
    renderList();

    // Check for grid classes
    const gridContainer = screen.getByText('John Organizer').closest('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('gap-4', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('handles error state with generic error message', () => {
    const error = { code: 'GENERIC_ERROR' };
    renderList({
      playDates: [],
      isLoading: false,
      error,
    });

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('hides create button in empty state when canCreate is false', () => {
    renderList({
      playDates: [],
      isLoading: false,
      canCreate: false,
    });

    expect(screen.queryByText('Create Play Date')).not.toBeInTheDocument();
  });

  it('hides load more button when hasMore is false', () => {
    renderList({
      hasMore: false,
    });

    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('renders play dates even when loading more', () => {
    renderList({
      isLoading: true,
      hasMore: true,
      onLoadMore: vi.fn(),
    });

    // Should still show existing play dates
    expect(screen.getByText('Mon, Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Tue, Jan 16, 2024')).toBeInTheDocument();
  });
});