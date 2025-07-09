import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { auth, db } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
  db: {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('useAuth', () => {
  const mockAuthStore = {
    user: null,
    session: null,
    player: null,
    isLoading: true,
    isInitialized: false,
    setAuth: vi.fn(),
    setPlayer: vi.fn(),
    setLoading: vi.fn(),
    setInitialized: vi.fn(),
    reset: vi.fn(),
    isAuthenticated: vi.fn(() => false),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'token-123',
    refresh_token: 'refresh-123',
    expires_at: 1234567890,
    expires_in: 3600,
    token_type: 'bearer',
  };

  const mockPlayer = {
    id: 'player-123',
    name: 'Test Player',
    email: 'test@example.com',
    claim_user_id: 'user-123',
    project_owner: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
    vi.mocked(auth.getSession).mockResolvedValue({
      session: null,
      error: null
    } as any);
    vi.mocked(auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('loads session on mount', async () => {
    vi.mocked(auth.getSession).mockResolvedValueOnce({
      session: mockSession,
      error: null,
    } as any);

    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockPlayer,
            error: null,
          }),
        }),
      }),
    } as any);

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(auth.getSession).toHaveBeenCalled();
      expect(mockAuthStore.setAuth).toHaveBeenCalledWith(mockUser, mockSession);
      expect(mockAuthStore.setPlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false);
      expect(mockAuthStore.setInitialized).toHaveBeenCalledWith(true);
    });
  });

  it('handles no session on mount', async () => {
    vi.mocked(auth.getSession).mockResolvedValueOnce({
      session: null,
      error: null,
    } as any);

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(auth.getSession).toHaveBeenCalled();
      expect(mockAuthStore.setAuth).toHaveBeenCalledWith(null, null);
      expect(mockAuthStore.setLoading).toHaveBeenCalledWith(false);
      expect(mockAuthStore.setInitialized).toHaveBeenCalledWith(true);
    });
  });

  it('subscribes to auth state changes', () => {
    renderHook(() => useAuth());
    
    expect(auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('handles sign out', async () => {
    vi.mocked(auth.signOut).mockResolvedValueOnce({ error: null } as any);
    
    const { result } = renderHook(() => useAuth());
    
    await result.current.signOut();
    
    expect(auth.signOut).toHaveBeenCalled();
    expect(mockAuthStore.reset).toHaveBeenCalled();
  });

  it('handles sign out error', async () => {
    const error = new Error('Sign out failed');
    vi.mocked(auth.signOut).mockResolvedValueOnce({ error } as any);
    
    // Provide initial authenticated state
    mockAuthStore.user = mockUser;
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    
    const { result } = renderHook(() => useAuth());
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(mockAuthStore.setInitialized).toHaveBeenCalledWith(true);
    });
    
    // Clear mock calls from initialization
    mockAuthStore.reset.mockClear();
    
    await expect(result.current.signOut()).rejects.toThrow('Sign out failed');
    expect(mockAuthStore.reset).not.toHaveBeenCalled();
  });

  it('checks player claim', async () => {
    mockAuthStore.user = mockUser;
    
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'player-123' },
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useAuth());
    
    const hasClaim = await result.current.checkPlayerClaim();
    
    expect(hasClaim).toBe(true);
    expect(db.supabase.from).toHaveBeenCalledWith('players');
  });

  it('returns false when user has no claim', async () => {
    mockAuthStore.user = mockUser;
    
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useAuth());
    
    const hasClaim = await result.current.checkPlayerClaim();
    
    expect(hasClaim).toBe(false);
  });

  it('claims a player', async () => {
    mockAuthStore.user = mockUser;
    
    vi.mocked(db.supabase.rpc).mockResolvedValueOnce({
      data: true,
      error: null,
    } as any);

    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockPlayer,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useAuth());
    
    await result.current.claimPlayer('player-123');
    
    expect(db.supabase.rpc).toHaveBeenCalledWith('claim_player', {
      p_player_id: 'player-123',
      p_user_id: 'user-123',
    });
    expect(mockAuthStore.setPlayer).toHaveBeenCalledWith(mockPlayer);
  });

  it('throws error when claiming without authentication', async () => {
    mockAuthStore.user = null;
    
    const { result } = renderHook(() => useAuth());
    
    await expect(result.current.claimPlayer('player-123')).rejects.toThrow(
      'Must be logged in to claim a player'
    );
  });

  it('handles claim error with custom message', async () => {
    mockAuthStore.user = mockUser;
    
    vi.mocked(db.supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'Player already claimed',
      },
    } as any);

    const { result } = renderHook(() => useAuth());
    
    await expect(result.current.claimPlayer('player-123')).rejects.toThrow(
      'Player already claimed'
    );
  });

  it('cleans up on unmount', () => {
    const unsubscribe = vi.fn();
    vi.mocked(auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as any);

    const { unmount } = renderHook(() => useAuth());
    
    unmount();
    
    expect(unsubscribe).toHaveBeenCalled();
  });
});