import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ConnectionStatus, ConnectionStatusBadge } from '../ConnectionStatus';
import * as RealtimeContext from '../../contexts/RealtimeContext';

// Mock the RealtimeContext
vi.mock('../../contexts/RealtimeContext');

describe('ConnectionStatus', () => {
  const mockReconnect = vi.fn();
  const mockConnectionState: RealtimeContext.ConnectionState = 'disconnected';

  beforeEach(() => {
    vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
      connectionState: mockConnectionState,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      hasError: false,
      reconnect: mockReconnect,
    });

    vi.mocked(RealtimeContext.useRealtimeConnectionChange).mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('should render status indicator', () => {
      render(<ConnectionStatus />);
      
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-label', 'Connection status: Disconnected');
    });

    it('should show label when showLabel is true', () => {
      render(<ConnectionStatus showLabel />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should position indicator correctly', () => {
      const { rerender } = render(<ConnectionStatus position="top-left" />);
      let status = screen.getByRole('status');
      expect(status).toHaveClass('top-4', 'left-4');

      rerender(<ConnectionStatus position="top-right" />);
      status = screen.getByRole('status');
      expect(status).toHaveClass('top-4', 'right-4');

      rerender(<ConnectionStatus position="bottom-left" />);
      status = screen.getByRole('status');
      expect(status).toHaveClass('bottom-4', 'left-4');

      rerender(<ConnectionStatus position="bottom-right" />);
      status = screen.getByRole('status');
      expect(status).toHaveClass('bottom-4', 'right-4');
    });

    it('should apply custom className', () => {
      render(<ConnectionStatus className="custom-class" />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveClass('custom-class');
    });
  });

  describe('connection states', () => {
    it('should show correct state for connecting', () => {
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connecting',
        isConnected: false,
        isConnecting: true,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus showLabel />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      // Should show pulse animation
      const status = screen.getByRole('status');
      expect(status.querySelector('.animate-ping')).toBeInTheDocument();
    });

    it('should show correct state for connected', () => {
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus showLabel />);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      // Should not show pulse animation
      const status = screen.getByRole('status');
      expect(status.querySelector('.animate-ping')).not.toBeInTheDocument();
    });

    it('should show correct state for reconnecting', () => {
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'reconnecting',
        isConnected: false,
        isConnecting: false,
        isReconnecting: true,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus showLabel />);
      
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      // Should show pulse animation
      const status = screen.getByRole('status');
      expect(status.querySelector('.animate-ping')).toBeInTheDocument();
    });

    it('should show correct state for error', () => {
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'error',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: true,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus showLabel />);
      
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      // Should show pulse animation
      const status = screen.getByRole('status');
      expect(status.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  describe('auto-hide behavior', () => {
    it('should auto-hide when connected after delay', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus autoHide autoHideDelay={1000} />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveClass('opacity-100');

      // Advance timers to trigger auto-hide
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      // Component should be unmounted after autoHideDelay
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should not auto-hide when autoHide is false', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus autoHide={false} />);
      
      const status = screen.getByRole('status');
      expect(status).toHaveClass('opacity-100');

      await vi.advanceTimersByTimeAsync(5000);

      expect(status).toHaveClass('opacity-100');
      expect(status).not.toHaveClass('pointer-events-none');
      
      vi.useRealTimers();
    });

    it('should show again when connection is lost', async () => {
      vi.useFakeTimers();
      
      const { rerender } = render(<ConnectionStatus autoHide />);
      
      // Start connected
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });
      rerender(<ConnectionStatus autoHide />);

      // Wait for auto-hide
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      
      // Component should be unmounted when hidden with autoHide
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      // Lose connection
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'disconnected',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });
      rerender(<ConnectionStatus autoHide />);

      // Component should remount and be visible
      const newStatus = screen.getByRole('status');
      expect(newStatus).toHaveClass('opacity-100');
      
      vi.useRealTimers();
    });
  });

  describe('reconnect button', () => {
    it('should show reconnect button after delay when disconnected', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'disconnected',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus />);
      
      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByText('Reconnect')).toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should show reconnect button after delay when error', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'error',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: true,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByText('Reconnect')).toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should not show reconnect button when connecting', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'connecting',
        isConnected: false,
        isConnecting: true,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus />);
      
      await vi.advanceTimersByTimeAsync(5000);

      expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should call reconnect when button clicked', async () => {
      vi.useFakeTimers();
      
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: 'disconnected',
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        reconnect: mockReconnect,
      });

      render(<ConnectionStatus />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByText('Reconnect')).toBeInTheDocument();

      const reconnectButton = screen.getByText('Reconnect');
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('toast notifications', () => {
    it('should log connection state changes when showToast is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      let mockCallback: (state: RealtimeContext.ConnectionState) => void = () => {};

      vi.mocked(RealtimeContext.useRealtimeConnectionChange).mockImplementation((cb) => {
        mockCallback = cb;
      });

      render(<ConnectionStatus showToast />);

      // Simulate state changes
      mockCallback('connected');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Realtime connected');

      mockCallback('disconnected');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Realtime disconnected');

      mockCallback('error');
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Realtime connection error');

      mockCallback('reconnecting');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Reconnecting to realtime...');

      consoleSpy.mockRestore();
    });

    it('should not log when showToast is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      let mockCallback: (state: RealtimeContext.ConnectionState) => void = () => {};

      vi.mocked(RealtimeContext.useRealtimeConnectionChange).mockImplementation((cb) => {
        mockCallback = cb;
      });

      render(<ConnectionStatus showToast={false} />);

      mockCallback('connected');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('ConnectionStatusBadge', () => {
  it('should render inline badge with correct state', () => {
    vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
      connectionState: 'connected',
      isConnected: true,
      isConnecting: false,
      isReconnecting: false,
      hasError: false,
      reconnect: vi.fn(),
    });

    render(<ConnectionStatusBadge />);
    
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Live');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should show different states correctly', () => {
    const { rerender } = render(<ConnectionStatusBadge />);

    // Test each state
    const states: Array<[RealtimeContext.ConnectionState, string, string[]]> = [
      ['connecting', 'Connecting', ['bg-yellow-100', 'text-yellow-800']],
      ['connected', 'Live', ['bg-green-100', 'text-green-800']],
      ['disconnected', 'Offline', ['bg-gray-100', 'text-gray-800']],
      ['reconnecting', 'Reconnecting', ['bg-orange-100', 'text-orange-800']],
      ['error', 'Error', ['bg-red-100', 'text-red-800']],
    ];

    states.forEach(([state, label, classes]) => {
      vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
        connectionState: state,
        isConnected: state === 'connected',
        isConnecting: state === 'connecting',
        isReconnecting: state === 'reconnecting',
        hasError: state === 'error',
        reconnect: vi.fn(),
      });

      rerender(<ConnectionStatusBadge />);
      
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent(label);
      classes.forEach(className => {
        expect(badge).toHaveClass(className);
      });
    });
  });

  it('should apply custom className', () => {
    vi.mocked(RealtimeContext.useRealtime).mockReturnValue({
      connectionState: 'connected',
      isConnected: true,
      isConnecting: false,
      isReconnecting: false,
      hasError: false,
      reconnect: vi.fn(),
    });

    render(<ConnectionStatusBadge className="ml-2" />);
    
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('ml-2');
  });
});