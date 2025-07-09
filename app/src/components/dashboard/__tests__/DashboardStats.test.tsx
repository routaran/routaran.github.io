import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardStats } from '../DashboardStats';
import type { PlayDateWithStats } from '../../../lib/supabase/playDates';

describe('DashboardStats', () => {
  const mockPlayDates: PlayDateWithStats[] = [
    {
      id: '1',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      organizer_id: 'org1',
      num_courts: 2,
      win_condition: 'first_to_target',
      target_score: 11,
      status: 'scheduled',
      schedule_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      date: new Date().toISOString(),
      organizer_id: 'org2',
      num_courts: 3,
      win_condition: 'win_by_2',
      target_score: 15,
      status: 'active',
      schedule_locked: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    {
      id: '3',
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      organizer_id: 'org1',
      num_courts: 2,
      win_condition: 'first_to_target',
      target_score: 11,
      status: 'completed',
      schedule_locked: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      organizer: {
        id: 'org1',
        name: 'John Organizer',
        email: 'john@example.com',
      },
      player_count: 8,
      match_count: 10,
      completed_matches: 10,
    },
  ];

  it('renders statistics correctly', () => {
    render(<DashboardStats playDates={mockPlayDates} isLoading={false} />);

    // Check total play dates
    expect(screen.getByText('Total Play Dates')).toBeInTheDocument();
    const totalElement = screen.getByText('Total Play Dates').closest('div')?.querySelector('.text-2xl');
    expect(totalElement).toHaveTextContent('3');

    // Check upcoming
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    const upcomingElement = screen.getByText('Upcoming').closest('div')?.querySelector('.text-2xl');
    expect(upcomingElement).toHaveTextContent('1');

    // Check in progress
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    const progressElement = screen.getByText('In Progress').closest('div')?.querySelector('.text-2xl');
    expect(progressElement).toHaveTextContent('1');

    // Check match completion
    expect(screen.getByText('Match Completion')).toBeInTheDocument();
    const completionElement = screen.getByText('Match Completion').closest('div')?.querySelector('.text-2xl');
    expect(completionElement).toHaveTextContent('51%'); // (18/35)*100 rounded
  });

  it('renders loading state', () => {
    render(<DashboardStats playDates={[]} isLoading={true} />);

    // Should render loading animations
    const loadingElements = screen.getAllByText((content, element) => {
      return element?.className?.includes('animate-pulse') ?? false;
    });
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('handles empty play dates', () => {
    render(<DashboardStats playDates={[]} isLoading={false} />);

    // Should show zeros for all stats
    expect(screen.getByText('Total Play Dates')).toBeInTheDocument();
    const totalElement = screen.getByText('Total Play Dates').closest('div')?.querySelector('.text-2xl');
    expect(totalElement).toHaveTextContent('0');

    expect(screen.getByText('Match Completion')).toBeInTheDocument();
    const completionElement = screen.getByText('Match Completion').closest('div')?.querySelector('.text-2xl');
    expect(completionElement).toHaveTextContent('0%');
  });

  it('filters upcoming play dates correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const todayDate = new Date();
    
    const customPlayDates: PlayDateWithStats[] = [
      {
        ...mockPlayDates[0],
        id: '1',
        date: futureDate.toISOString(),
        status: 'scheduled',
      },
      {
        ...mockPlayDates[0],
        id: '2',
        date: todayDate.toISOString(),
        status: 'scheduled',
      },
      {
        ...mockPlayDates[0],
        id: '3',
        date: todayDate.toISOString(),
        status: 'active', // Not scheduled, so not upcoming
      },
    ];

    render(<DashboardStats playDates={customPlayDates} isLoading={false} />);

    // Should count both future and today's scheduled play dates as upcoming
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    const upcomingElement = screen.getByText('Upcoming').closest('div')?.querySelector('.text-2xl');
    expect(upcomingElement).toHaveTextContent('2');
  });

  it('calculates match completion rate correctly', () => {
    const customPlayDates: PlayDateWithStats[] = [
      {
        ...mockPlayDates[0],
        match_count: 10,
        completed_matches: 5,
      },
      {
        ...mockPlayDates[0],
        id: '2',
        match_count: 20,
        completed_matches: 15,
      },
    ];

    render(<DashboardStats playDates={customPlayDates} isLoading={false} />);

    // (5+15)/(10+20) = 20/30 = 67%
    const completionElement = screen.getByText('Match Completion').closest('div')?.querySelector('.text-2xl');
    expect(completionElement).toHaveTextContent('67%');
  });

  it('applies correct styling to stat cards', () => {
    render(<DashboardStats playDates={mockPlayDates} isLoading={false} />);

    // Check for color classes
    expect(screen.getByText('Total Play Dates').closest('.bg-gray-50')).toBeInTheDocument();
    expect(screen.getByText('Upcoming').closest('.bg-blue-50')).toBeInTheDocument();
    expect(screen.getByText('In Progress').closest('.bg-green-50')).toBeInTheDocument();
    expect(screen.getByText('Match Completion').closest('.bg-purple-50')).toBeInTheDocument();
  });
});