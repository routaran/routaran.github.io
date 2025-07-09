import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerSelector } from '../PlayerSelector'
import type { PlayerInsert } from '../../../types/database'

describe('PlayerSelector', () => {
  const mockPlayers: PlayerInsert[] = [
    { name: 'John Doe', email: 'john@example.com', play_date_id: '' },
    { name: 'Jane Smith', email: 'jane@example.com', play_date_id: '' },
  ]

  const defaultProps = {
    players: mockPlayers,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders player list with count', () => {
    render(<PlayerSelector {...defaultProps} />)
    
    expect(screen.getByText('Players (2/16)')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('shows empty state when no players', () => {
    render(<PlayerSelector {...defaultProps} players={[]} />)
    
    expect(screen.getByText('No players added yet')).toBeInTheDocument()
  })

  it('filters players based on search query', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search players...')
    await userEvent.type(searchInput, 'john')
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
  })

  it('filters players by email', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search players...')
    await userEvent.type(searchInput, 'jane@')
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('removes player when X button is clicked', () => {
    render(<PlayerSelector {...defaultProps} />)
    
    const removeButtons = screen.getAllByLabelText(/Remove/)
    fireEvent.click(removeButtons[0])
    
    expect(defaultProps.onChange).toHaveBeenCalledWith([mockPlayers[1]])
  })

  it('shows add player form when Add Player button is clicked', () => {
    render(<PlayerSelector {...defaultProps} />)
    
    const addButton = screen.getByText('Add Player')
    fireEvent.click(addButton)
    
    expect(screen.getByText('Add New Player')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('validates required fields when adding player', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    fireEvent.click(screen.getByText('Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Player name is required')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    
    const nameInput = screen.getByPlaceholderText('Player name')
    const emailInput = screen.getByPlaceholderText('player@example.com')
    
    await userEvent.type(nameInput, 'Test Player')
    await userEvent.type(emailInput, 'invalid-email')
    
    fireEvent.click(screen.getByText('Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('prevents duplicate names', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    
    const nameInput = screen.getByPlaceholderText('Player name')
    const emailInput = screen.getByPlaceholderText('player@example.com')
    
    await userEvent.type(nameInput, 'John Doe')
    await userEvent.type(emailInput, 'john2@example.com')
    
    fireEvent.click(screen.getByText('Add'))
    
    await waitFor(() => {
      expect(screen.getByText('A player with this name already exists')).toBeInTheDocument()
    })
  })

  it('prevents duplicate emails', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    
    const nameInput = screen.getByPlaceholderText('Player name')
    const emailInput = screen.getByPlaceholderText('player@example.com')
    
    await userEvent.type(nameInput, 'John Doe 2')
    await userEvent.type(emailInput, 'john@example.com')
    
    fireEvent.click(screen.getByText('Add'))
    
    await waitFor(() => {
      expect(screen.getByText('A player with this email already exists')).toBeInTheDocument()
    })
  })

  it('adds valid player successfully', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    
    const nameInput = screen.getByPlaceholderText('Player name')
    const emailInput = screen.getByPlaceholderText('player@example.com')
    
    await userEvent.type(nameInput, 'New Player')
    await userEvent.type(emailInput, 'new@example.com')
    
    fireEvent.click(screen.getByText('Add'))
    
    expect(defaultProps.onChange).toHaveBeenCalledWith([
      ...mockPlayers,
      { name: 'New Player', email: 'new@example.com', play_date_id: '' }
    ])
  })

  it('cancels add player form', () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(screen.queryByText('Add New Player')).not.toBeInTheDocument()
  })

  it('respects minPlayers prop', () => {
    render(<PlayerSelector {...defaultProps} players={[]} minPlayers={4} />)
    
    expect(screen.getByText('Add at least 4 more players')).toBeInTheDocument()
  })

  it('respects maxPlayers prop', () => {
    const maxPlayers = Array.from({ length: 16 }, (_, i) => ({
      name: `Player ${i + 1}`,
      email: `player${i + 1}@example.com`,
      play_date_id: ''
    }))
    
    render(<PlayerSelector {...defaultProps} players={maxPlayers} maxPlayers={16} />)
    
    const addButton = screen.getByText('Add Player')
    expect(addButton).toBeDisabled()
  })

  it('disables all actions when disabled prop is true', () => {
    render(<PlayerSelector {...defaultProps} disabled />)
    
    expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument()
    expect(screen.queryByText('Add Player')).not.toBeInTheDocument()
  })

  it('trims whitespace from player names and emails', async () => {
    render(<PlayerSelector {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Add Player'))
    
    const nameInput = screen.getByPlaceholderText('Player name')
    const emailInput = screen.getByPlaceholderText('player@example.com')
    
    await userEvent.type(nameInput, '  New Player  ')
    await userEvent.type(emailInput, '  new@example.com  ')
    
    fireEvent.click(screen.getByText('Add'))
    
    expect(defaultProps.onChange).toHaveBeenCalledWith([
      ...mockPlayers,
      { name: 'New Player', email: 'new@example.com', play_date_id: '' }
    ])
  })
})