import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CourtSelector } from '../CourtSelector'

describe('CourtSelector', () => {
  const defaultProps = {
    courtCount: 2,
    onChange: vi.fn(),
  }

  it('renders with initial court count', () => {
    render(<CourtSelector {...defaultProps} />)
    
    expect(screen.getByLabelText('Number of Courts')).toHaveValue('2')
  })

  it('displays correct label for single court', () => {
    render(<CourtSelector {...defaultProps} courtCount={1} />)
    
    const select = screen.getByLabelText('Number of Courts')
    expect(select).toContainHTML('<option value="1">1 Court</option>')
  })

  it('displays correct label for multiple courts', () => {
    render(<CourtSelector {...defaultProps} />)
    
    const select = screen.getByLabelText('Number of Courts')
    expect(select).toContainHTML('<option value="2">2 Courts</option>')
    expect(select).toContainHTML('<option value="3">3 Courts</option>')
    expect(select).toContainHTML('<option value="4">4 Courts</option>')
  })

  it('calls onChange when selection changes', () => {
    render(<CourtSelector {...defaultProps} />)
    
    const select = screen.getByLabelText('Number of Courts')
    fireEvent.change(select, { target: { value: '3' } })
    
    expect(defaultProps.onChange).toHaveBeenCalledWith(3)
  })

  it('respects maxCourts prop', () => {
    render(<CourtSelector {...defaultProps} maxCourts={2} />)
    
    const select = screen.getByLabelText('Number of Courts')
    const options = select.querySelectorAll('option')
    
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveValue('1')
    expect(options[1]).toHaveValue('2')
  })

  it('defaults to 4 courts maximum', () => {
    render(<CourtSelector {...defaultProps} />)
    
    const select = screen.getByLabelText('Number of Courts')
    const options = select.querySelectorAll('option')
    
    expect(options).toHaveLength(4)
  })

  it('disables select when disabled prop is true', () => {
    render(<CourtSelector {...defaultProps} disabled />)
    
    expect(screen.getByLabelText('Number of Courts')).toBeDisabled()
  })

  it('displays help text', () => {
    render(<CourtSelector {...defaultProps} />)
    
    expect(screen.getByText('Number of courts available for simultaneous play')).toBeInTheDocument()
  })
})