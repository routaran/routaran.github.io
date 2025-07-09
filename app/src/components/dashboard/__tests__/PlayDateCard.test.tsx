import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PlayDateCard } from '../PlayDateCard';
import { useAuth } from '../../../hooks/useAuth';
import type { PlayDateWithStats } from '../../../lib/supabase/playDates';

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = useAuth as any;

describe('PlayDateCard', () => {
  const mockPlayDate: PlayDateWithStats = {
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
  };

  const mockPlayer = {
    id: 'player1',
    name: 'Test Player',
    email: 'test@example.com',
    project_owner: false,
  };

  const renderCard = (playDate = mockPlayDate, onEdit?: (playDate: PlayDateWithStats) => void) => {
    return render(
      <BrowserRouter>
        <PlayDateCard playDate={playDate} onEdit={onEdit} />
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

  it('renders play date information correctly', () => {
    renderCard();

    expect(screen.getByText('Mon, Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Organized by John Organizer')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // player count
    expect(screen.getByText('0/10')).toBeInTheDocument(); // matches
    expect(screen.getByText('2')).toBeInTheDocument(); // courts
  });

  it('shows correct status for different play date statuses', () => {
    const activePlayDate = { ...mockPlayDate, status: 'active' as const };
    renderCard(activePlayDate);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Match Progress')).toBeInTheDocument();
  });

  it('displays schedule locked indicator', () => {
    const lockedPlayDate = { ...mockPlayDate, schedule_locked: true };
    renderCard(lockedPlayDate);

    expect(screen.getByText('Schedule Locked')).toBeInTheDocument();
  });

  it('shows progress bar for active play dates', () => {
    const activePlayDate = { 
      ...mockPlayDate, 
      status: 'active' as const, 
      match_count: 10,
      completed_matches: 6,
    };
    renderCard(activePlayDate);

    expect(screen.getByText('Match Progress')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('displays game settings correctly', () => {
    renderCard();

    expect(screen.getByText('First to 11')).toBeInTheDocument();
  });

  it('shows win by 2 condition correctly', () => {
    const winBy2PlayDate = { 
      ...mockPlayDate, 
      win_condition: 'win_by_2' as const,
      target_score: 15,
    };
    renderCard(winBy2PlayDate);

    expect(screen.getByText('Win by 2 (target: 15)')).toBeInTheDocument();
  });

  it('shows edit button for organizer', () => {
    const organizerPlayer = { ...mockPlayer, id: 'org1' };
    mockUseAuth.mockReturnValue({
      player: organizerPlayer,
      user: { id: 'user1' },
      isAuthenticated: true,
    });

    const onEdit = vi.fn();
    renderCard(mockPlayDate, onEdit);

    const editButton = screen.getByText('Edit');
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(mockPlayDate);
  });

  it('shows edit button for project owner', () => {
    const projectOwner = { ...mockPlayer, project_owner: true };
    mockUseAuth.mockReturnValue({
      player: projectOwner,
      user: { id: 'user1' },
      isAuthenticated: true,
    });

    const onEdit = vi.fn();
    renderCard(mockPlayDate, onEdit);

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('hides edit button for non-organizer players', () => {
    const regularPlayer = { ...mockPlayer, id: 'different-player' };
    mockUseAuth.mockReturnValue({
      player: regularPlayer,
      user: { id: 'user1' },
      isAuthenticated: true,
    });

    const onEdit = vi.fn();
    renderCard(mockPlayDate, onEdit);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('hides edit button when no onEdit handler provided', () => {
    const organizerPlayer = { ...mockPlayer, id: 'org1' };
    mockUseAuth.mockReturnValue({
      player: organizerPlayer,
      user: { id: 'user1' },
      isAuthenticated: true,
    });

    renderCard(mockPlayDate);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('has correct link to play date details', () => {
    renderCard();

    const viewDetailsLink = screen.getByRole('link', { name: /view details/i });
    expect(viewDetailsLink).toHaveAttribute('href', `/play-dates/${mockPlayDate.id}`);
  });

  it('applies correct styling for different statuses', () => {
    const completedPlayDate = { ...mockPlayDate, status: 'completed' as const };
    renderCard(completedPlayDate);

    const statusBadge = screen.getByText('Completed');
    expect(statusBadge.closest('.text-gray-600')).toBeInTheDocument();
  });

  it('shows pulsing animation for active play dates', () => {
    const activePlayDate = { ...mockPlayDate, status: 'active' as const };
    renderCard(activePlayDate);

    const statusBadge = screen.getByText('In Progress');
    expect(statusBadge.closest('.animate-pulse')).toBeInTheDocument();
  });

  it('handles unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      player: null,
      user: null,
      isAuthenticated: false,
    });

    renderCard();

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});