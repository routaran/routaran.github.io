import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useConflictResolution, useOptimisticMatchUpdate } from '../useConflictResolution';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../../lib/logger');
vi.mock('../../lib/monitoring');

const mockSupabase = supabase as any;

describe('useConflictResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with no conflicts', () => {
      const { result } = renderHook(() => useConflictResolution());

      expect(result.current.conflicts).toEqual([]);
      expect(result.current.hasConflicts).toBe(false);
    });

    it('should provide expected methods', () => {
      const { result } = renderHook(() => useConflictResolution());

      expect(typeof result.current.updateMatch).toBe('function');
      expect(typeof result.current.resolveConflict).toBe('function');
      expect(typeof result.current.dismissConflict).toBe('function');
      expect(typeof result.current.clearConflicts).toBe('function');
    });
  });

  describe('updateMatch functionality', () => {
    it('should successfully update match without conflicts', async () => {
      const mockCurrentMatch = {
        id: 'match-123',
        version: 1,
        team1_score: 10,
        team2_score: 8,
      };

      const mockUpdatedMatch = {
        ...mockCurrentMatch,
        version: 2,
        team1_score: 15,
        team2_score: 10,
      };

      // Mock successful fetch and update
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockCurrentMatch,
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockUpdatedMatch,
                  error: null,
                })),
              })),
            })),
          })),
        })),
      }));

      const { result } = renderHook(() => useConflictResolution());

      const updateResult = await act(async () => {
        return result.current.updateMatch('match-123', {
          team1_score: 15,
          team2_score: 10,
        });
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.conflict).toBeUndefined();
    });

    it('should detect version conflicts', async () => {
      const mockCurrentMatch = {
        id: 'match-123',
        version: 1,
        team1_score: 10,
        team2_score: 8,
      };

      const mockLatestMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      // Mock initial fetch
      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        // Mock failed update due to version conflict
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: null,
                    error: { message: 'version conflict', code: '23505' },
                  })),
                })),
              })),
            })),
          })),
        })
        // Mock latest fetch
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockLatestMatch,
                error: null,
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution());

      const updateResult = await act(async () => {
        return result.current.updateMatch('match-123', {
          team1_score: 15,
          team2_score: 10,
        });
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.conflict).toBeDefined();
      expect(updateResult.conflict?.matchId).toBe('match-123');
      expect(updateResult.conflict?.localVersion).toBe(1);
      expect(updateResult.conflict?.remoteVersion).toBe(2);
      expect(result.current.hasConflicts).toBe(true);
    });

    it('should handle database errors', async () => {
      // Mock failed fetch
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Match not found' },
            })),
          })),
        })),
      }));

      const { result } = renderHook(() => useConflictResolution());

      await expect(act(async () => {
        return result.current.updateMatch('match-123', {
          team1_score: 15,
          team2_score: 10,
        });
      })).rejects.toThrow('Match not found');
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflict with latest-wins strategy', async () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const mockCurrentMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      const mockUpdatedMatch = {
        ...mockCurrentMatch,
        version: 3,
      };

      // Mock successful resolution
      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockUpdatedMatch,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution());

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      const resolved = await act(async () => {
        return result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      expect(resolved).toBe(true);
      expect(result.current.hasConflicts).toBe(false);
    });

    it('should resolve conflict with user-wins strategy', async () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const mockCurrentMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      const mockUpdatedMatch = {
        ...mockCurrentMatch,
        version: 3,
        team1_score: 15,
        team2_score: 10,
      };

      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockUpdatedMatch,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution());

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      const resolved = await act(async () => {
        return result.current.resolveConflict('conflict-123', { name: 'user-wins' });
      });

      expect(resolved).toBe(true);
    });

    it('should handle merge strategy with custom merge function', async () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const mockCurrentMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      const mockUpdatedMatch = {
        ...mockCurrentMatch,
        version: 3,
        team1_score: 20, // Merged result
        team2_score: 15,
      };

      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockUpdatedMatch,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution());

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      const customMerge = (local: any, remote: any) => ({
        team1_score: Math.max(local.team1_score || 0, remote.team1_score || 0),
        team2_score: Math.max(local.team2_score || 0, remote.team2_score || 0),
        version: remote.version,
      });

      const resolved = await act(async () => {
        return result.current.resolveConflict('conflict-123', { 
          name: 'merge',
          mergeFunction: customMerge,
        });
      });

      expect(resolved).toBe(true);
    });

    it('should handle resolution failures', async () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      // Mock failed resolution
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        })),
      }));

      const { result } = renderHook(() => useConflictResolution());

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      const resolved = await act(async () => {
        return result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      expect(resolved).toBe(false);
      expect(result.current.hasConflicts).toBe(true);
    });

    it('should respect max retry attempts', async () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const mockOnResolutionFailed = vi.fn();

      // Mock failed resolution
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        })),
      }));

      const { result } = renderHook(() => useConflictResolution({
        maxRetries: 2,
        onResolutionFailed: mockOnResolutionFailed,
      }));

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      // Try resolving multiple times
      await act(async () => {
        await result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      await act(async () => {
        await result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      // Third attempt should fail due to max retries
      const resolved = await act(async () => {
        return result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      expect(resolved).toBe(false);
      expect(mockOnResolutionFailed).toHaveBeenCalledWith(
        expect.objectContaining({ conflictId: 'conflict-123' }),
        expect.any(Error)
      );
    });
  });

  describe('conflict management', () => {
    it('should dismiss conflicts', () => {
      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const { result } = renderHook(() => useConflictResolution());

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      expect(result.current.hasConflicts).toBe(true);

      // Dismiss conflict
      act(() => {
        result.current.dismissConflict('conflict-123');
      });

      expect(result.current.hasConflicts).toBe(false);
    });

    it('should clear all conflicts', () => {
      const mockConflicts = [
        {
          conflictId: 'conflict-1',
          matchId: 'match-1',
          localVersion: 1,
          remoteVersion: 2,
          localChanges: {},
          remoteChanges: {},
          timestamp: new Date(),
        },
        {
          conflictId: 'conflict-2',
          matchId: 'match-2',
          localVersion: 1,
          remoteVersion: 2,
          localChanges: {},
          remoteChanges: {},
          timestamp: new Date(),
        },
      ];

      const { result } = renderHook(() => useConflictResolution());

      // Add conflicts manually
      act(() => {
        result.current.conflicts.push(...mockConflicts);
      });

      expect(result.current.conflicts).toHaveLength(2);

      // Clear all conflicts
      act(() => {
        result.current.clearConflicts();
      });

      expect(result.current.conflicts).toHaveLength(0);
    });
  });

  describe('callbacks', () => {
    it('should call onConflictDetected callback', async () => {
      const mockOnConflictDetected = vi.fn();

      const mockCurrentMatch = {
        id: 'match-123',
        version: 1,
        team1_score: 10,
        team2_score: 8,
      };

      const mockLatestMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: null,
                    error: { message: 'version conflict', code: '23505' },
                  })),
                })),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockLatestMatch,
                error: null,
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution({
        onConflictDetected: mockOnConflictDetected,
      }));

      await act(async () => {
        await result.current.updateMatch('match-123', {
          team1_score: 15,
          team2_score: 10,
        });
      });

      expect(mockOnConflictDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'match-123',
          localVersion: 1,
          remoteVersion: 2,
        })
      );
    });

    it('should call onConflictResolved callback', async () => {
      const mockOnConflictResolved = vi.fn();

      const mockConflict = {
        conflictId: 'conflict-123',
        matchId: 'match-123',
        localVersion: 1,
        remoteVersion: 2,
        localChanges: { team1_score: 15, team2_score: 10 },
        remoteChanges: { team1_score: 12, team2_score: 11, version: 2 },
        timestamp: new Date(),
      };

      const mockCurrentMatch = {
        id: 'match-123',
        version: 2,
        team1_score: 12,
        team2_score: 11,
      };

      const mockUpdatedMatch = {
        ...mockCurrentMatch,
        version: 3,
      };

      mockSupabase.from = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockCurrentMatch,
                error: null,
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockUpdatedMatch,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        });

      const { result } = renderHook(() => useConflictResolution({
        onConflictResolved: mockOnConflictResolved,
      }));

      // Add conflict manually
      act(() => {
        result.current.conflicts.push(mockConflict);
      });

      await act(async () => {
        await result.current.resolveConflict('conflict-123', { name: 'latest-wins' });
      });

      expect(mockOnConflictResolved).toHaveBeenCalledWith(
        expect.objectContaining({ conflictId: 'conflict-123' }),
        expect.objectContaining({ name: 'latest-wins' })
      );
    });
  });
});

describe('useOptimisticMatchUpdate', () => {
  it('should provide simplified match update interface', () => {
    const { result } = renderHook(() => useOptimisticMatchUpdate());

    expect(typeof result.current.updateMatch).toBe('function');
    expect(Array.isArray(result.current.conflicts)).toBe(true);
    expect(typeof result.current.resolveConflict).toBe('function');
  });

  it('should automatically resolve conflicts with default strategy', async () => {
    const mockCurrentMatch = {
      id: 'match-123',
      version: 1,
      team1_score: 10,
      team2_score: 8,
    };

    const mockLatestMatch = {
      id: 'match-123',
      version: 2,
      team1_score: 12,
      team2_score: 11,
    };

    const mockFinalMatch = {
      id: 'match-123',
      version: 3,
      team1_score: 12,
      team2_score: 11,
    };

    mockSupabase.from = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockCurrentMatch,
              error: null,
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: { message: 'version conflict', code: '23505' },
                })),
              })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockLatestMatch,
              error: null,
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockLatestMatch,
              error: null,
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockFinalMatch,
                  error: null,
                })),
              })),
            })),
          })),
        })),
      });

    const { result } = renderHook(() => useOptimisticMatchUpdate({ name: 'latest-wins' }));

    const success = await act(async () => {
      return result.current.updateMatch('match-123', {
        team1_score: 15,
        team2_score: 10,
      });
    });

    expect(success).toBe(true);
  });

  it('should return false for manual conflicts', async () => {
    const mockCurrentMatch = {
      id: 'match-123',
      version: 1,
      team1_score: 10,
      team2_score: 8,
    };

    const mockLatestMatch = {
      id: 'match-123',
      version: 2,
      team1_score: 12,
      team2_score: 11,
    };

    mockSupabase.from = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockCurrentMatch,
              error: null,
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: { message: 'version conflict', code: '23505' },
                })),
              })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockLatestMatch,
              error: null,
            })),
          })),
        })),
      });

    const { result } = renderHook(() => useOptimisticMatchUpdate({ name: 'manual' }));

    const success = await act(async () => {
      return result.current.updateMatch('match-123', {
        team1_score: 15,
        team2_score: 10,
      });
    });

    expect(success).toBe(false);
    expect(result.current.conflicts).toHaveLength(1);
  });
});