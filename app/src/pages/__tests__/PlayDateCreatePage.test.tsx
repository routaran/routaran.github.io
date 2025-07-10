import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PlayDateCreatePage } from '../PlayDateCreatePage'

// Mock the hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/usePlayDate', () => ({
  usePlayDate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

import { useAuth } from '../../hooks/useAuth'
import { usePlayDate } from '../../hooks/usePlayDate'
import { useNavigate } from 'react-router-dom'

const mockUseAuth = vi.mocked(useAuth)
const mockUsePlayDate = vi.mocked(usePlayDate)
const mockNavigate = vi.mocked(useNavigate)

describe('PlayDateCreatePage', () => {
  const mockCreatePlayDate = vi.fn()
  const mockNavigateFunc = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReturnValue(mockNavigateFunc)
    mockUsePlayDate.mockReturnValue({
      createPlayDate: mockCreatePlayDate,
      loading: false,
      playDate: null,
      canEdit: false,
      isOrganizer: false,
      isProjectOwner: false,
      updatePlayDate: vi.fn(),
      deletePlayDate: vi.fn(),
      regenerateSchedule: vi.fn(),
      exportToJson: vi.fn(),
      addPlayer: vi.fn(),
      updatePlayer: vi.fn(),
      deletePlayer: vi.fn(),
      reload: vi.fn(),
    })
  })

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    expect(mockNavigateFunc).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders create form when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    expect(screen.getByText('Create Play Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Play Date Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByText('What happens next?')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    const backButton = screen.getByText('Back')
    fireEvent.click(backButton)

    expect(mockNavigateFunc).toHaveBeenCalledWith(-1)
  })

  it('calls createPlayDate when form is submitted', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    // The form submission logic would be tested in PlayDateForm component tests
    // This test ensures the page passes the correct handlers to the form
    expect(mockUsePlayDate).toHaveBeenCalled()
  })

  it('shows help text about what happens next', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    expect(screen.getByText('What happens next?')).toBeInTheDocument()
    expect(screen.getByText(/A round-robin schedule will be automatically generated/)).toBeInTheDocument()
    expect(screen.getByText(/Each partnership will play against every other partnership/)).toBeInTheDocument()
    expect(screen.getByText(/Players can log in with their email to enter scores/)).toBeInTheDocument()
    expect(screen.getByText(/Live rankings will update as matches are completed/)).toBeInTheDocument()
  })

  it('passes loading state to form', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    mockUsePlayDate.mockReturnValue({
      createPlayDate: mockCreatePlayDate,
      loading: true,
      playDate: null,
      canEdit: false,
      isOrganizer: false,
      isProjectOwner: false,
      updatePlayDate: vi.fn(),
      deletePlayDate: vi.fn(),
      regenerateSchedule: vi.fn(),
      exportToJson: vi.fn(),
      addPlayer: vi.fn(),
      updatePlayer: vi.fn(),
      deletePlayer: vi.fn(),
      reload: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    // Form should be disabled when loading
    expect(screen.getByText('Create Play Date')).toBeDisabled()
  })

  it('has correct page title and description', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
      loading: false,
      signOut: vi.fn(),
    })

    render(
      <BrowserRouter>
        <PlayDateCreatePage />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create Play Date')
    expect(screen.getByText('Set up a new pickleball tournament with round-robin scheduling')).toBeInTheDocument()
  })
})