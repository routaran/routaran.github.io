import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayDateForm } from '../PlayDateForm'
import type { PlayDate, PlayerInsert } from '../../../types/database'

describe('PlayDateForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  }

  const mockInitialData: Partial<PlayDate> = {
    name: 'Test Play Date',
    date: '2025-12-01',
    win_condition: 'first-to-target',
    target_score: 11,
    court_count: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set a fixed date for testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders all form fields', () => {
    render(<PlayDateForm {...defaultProps} />)
    
    expect(screen.getByLabelText('Play Date Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Win Condition')).toBeInTheDocument()
    expect(screen.getByLabelText('Target Score')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of Courts')).toBeInTheDocument()
    expect(screen.getByText(/Players/)).toBeInTheDocument()
  })

  it('renders with initial data when editing', () => {
    render(
      <PlayDateForm 
        {...defaultProps} 
        initialData={mockInitialData}
        isEditing={true}
      />
    )
    
    expect(screen.getByLabelText('Play Date Name')).toHaveValue('Test Play Date')
    expect(screen.getByLabelText('Date')).toHaveValue('2025-12-01')
    expect(screen.getByLabelText('Win Condition')).toHaveValue('first-to-target')
    expect(screen.getByLabelText('Target Score')).toHaveValue('11')
    expect(screen.getByLabelText('Number of Courts')).toHaveValue('2')
  })

  it('hides player selector when editing', () => {
    render(
      <PlayDateForm 
        {...defaultProps} 
        isEditing={true}
        canEditPlayers={false}
      />
    )
    
    expect(screen.queryByText(/Players/)).not.toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<PlayDateForm {...defaultProps} />)
    
    const submitButton = screen.getByText('Create Play Date')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Play date name is required')).toBeInTheDocument()
      expect(screen.getByText('Date is required')).toBeInTheDocument()
      expect(screen.getByText('At least 4 players are required')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates date is not in the past', async () => {
    render(<PlayDateForm {...defaultProps} />)
    
    const dateInput = screen.getByLabelText('Date')
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2024-12-31')
    
    const submitButton = screen.getByText('Create Play Date')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Date must be today or in the future')).toBeInTheDocument()
    })
  })

  it('validates target score range', async () => {
    render(<PlayDateForm {...defaultProps} />)
    
    const targetScoreInput = screen.getByLabelText('Target Score')
    await userEvent.clear(targetScoreInput)
    await userEvent.type(targetScoreInput, '25')
    
    const submitButton = screen.getByText('Create Play Date')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Target score must be between 5 and 21')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    render(<PlayDateForm {...defaultProps} />)
    
    // Fill out form
    const nameInput = screen.getByLabelText('Play Date Name')
    const dateInput = screen.getByLabelText('Date')
    
    await userEvent.type(nameInput, 'Saturday Tournament')
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2025-12-15')
    
    // Add players
    const addPlayerButton = screen.getByText('Add Player')
    
    // Add 4 players (minimum required)
    for (let i = 1; i <= 4; i++) {
      fireEvent.click(addPlayerButton)
      
      const playerNameInput = screen.getByPlaceholderText('Player name')
      const playerEmailInput = screen.getByPlaceholderText('player@example.com')
      
      await userEvent.type(playerNameInput, `Player ${i}`)
      await userEvent.type(playerEmailInput, `player${i}@example.com`)
      
      fireEvent.click(screen.getByText('Add'))
    }
    
    // Submit form
    const submitButton = screen.getByText('Create Play Date')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Saturday Tournament',
          date: '2025-12-15',
          win_condition: 'first-to-target',
          target_score: 11,
          court_count: 1,
        }),
        expect.arrayContaining([
          expect.objectContaining({ name: 'Player 1', email: 'player1@example.com' }),
          expect.objectContaining({ name: 'Player 2', email: 'player2@example.com' }),
          expect.objectContaining({ name: 'Player 3', email: 'player3@example.com' }),
          expect.objectContaining({ name: 'Player 4', email: 'player4@example.com' }),
        ])
      )
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<PlayDateForm {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables form when loading', () => {
    render(<PlayDateForm {...defaultProps} loading={true} />)
    
    expect(screen.getByLabelText('Play Date Name')).toBeDisabled()
    expect(screen.getByLabelText('Date')).toBeDisabled()
    expect(screen.getByLabelText('Win Condition')).toBeDisabled()
    expect(screen.getByLabelText('Target Score')).toBeDisabled()
    expect(screen.getByLabelText('Number of Courts')).toBeDisabled()
    expect(screen.getByText('Create Play Date')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('shows update button text when editing', () => {
    render(
      <PlayDateForm 
        {...defaultProps} 
        isEditing={true}
      />
    )
    
    expect(screen.getByText('Update Play Date')).toBeInTheDocument()
    expect(screen.queryByText('Create Play Date')).not.toBeInTheDocument()
  })

  it('clears field errors when user types', async () => {
    render(<PlayDateForm {...defaultProps} />)
    
    // Submit to trigger validation errors
    const submitButton = screen.getByText('Create Play Date')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Play date name is required')).toBeInTheDocument()
    })
    
    // Type in the field
    const nameInput = screen.getByLabelText('Play Date Name')
    await userEvent.type(nameInput, 'Test')
    
    // Error should be cleared
    expect(screen.queryByText('Play date name is required')).not.toBeInTheDocument()
  })

  it('sets minimum date to today', () => {
    render(<PlayDateForm {...defaultProps} />)
    
    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    expect(dateInput.min).toBe('2025-01-01')
  })
})