import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { monitor } from '../lib/monitoring';
import type { Match, MatchUpdate } from '../types/database';

export interface ConflictInfo {
  conflictId: string;
  matchId: string;
  localVersion: number;
  remoteVersion: number;
  localChanges: Partial<MatchUpdate>;
  remoteChanges: Partial<Match>;
  timestamp: Date;
}

export interface ConflictResolutionStrategy {
  /** Strategy name */
  name: 'manual' | 'latest-wins' | 'user-wins' | 'merge';
  /** Optional custom merge function */
  mergeFunction?: (local: Partial<MatchUpdate>, remote: Partial<Match>) => Partial<MatchUpdate>;
}

export interface UseConflictResolutionOptions {
  /** Default resolution strategy */
  defaultStrategy?: ConflictResolutionStrategy;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Callback when conflict is detected */
  onConflictDetected?: (conflict: ConflictInfo) => void;
  /** Callback when conflict is resolved */
  onConflictResolved?: (conflict: ConflictInfo, strategy: ConflictResolutionStrategy) => void;
  /** Callback when resolution fails */
  onResolutionFailed?: (conflict: ConflictInfo, error: Error) => void;
}

export interface UseConflictResolutionReturn {
  /** Current unresolved conflicts */
  conflicts: ConflictInfo[];
  /** Whether there are any conflicts */
  hasConflicts: boolean;
  /** Update a match with conflict resolution */
  updateMatch: (matchId: string, updates: Partial<MatchUpdate>) => Promise<{ success: boolean; conflict?: ConflictInfo }>;
  /** Resolve a specific conflict */
  resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<boolean>;
  /** Dismiss a conflict without resolving */
  dismissConflict: (conflictId: string) => void;
  /** Clear all conflicts */
  clearConflicts: () => void;
}

/**
 * Hook for handling optimistic locking conflicts with various resolution strategies.
 * 
 * @example
 * ```tsx
 * const { updateMatch, conflicts, resolveConflict } = useConflictResolution({
 *   defaultStrategy: { name: 'latest-wins' },
 *   onConflictDetected: (conflict) => {
 *     console.log('Conflict detected:', conflict);
 *   },
 * });
 * 
 * // Update match with automatic conflict resolution
 * const result = await updateMatch('match-123', {
 *   team1_score: 15,
 *   team2_score: 10,
 * });
 * 
 * if (result.conflict) {
 *   // Manual resolution required
 *   await resolveConflict(result.conflict.conflictId, { name: 'user-wins' });
 * }
 * ```
 */
export function useConflictResolution({
  defaultStrategy = { name: 'latest-wins' },
  maxRetries = 3,
  onConflictDetected,
  onConflictResolved,
  onResolutionFailed,
}: UseConflictResolutionOptions = {}): UseConflictResolutionReturn {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  /**
   * Generate unique conflict ID
   */
  const generateConflictId = useCallback(() => {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Add a new conflict
   */
  const addConflict = useCallback((conflict: ConflictInfo) => {
    setConflicts(prev => {
      // Check if conflict already exists
      const existingIndex = prev.findIndex(c => c.matchId === conflict.matchId);
      if (existingIndex !== -1) {
        // Update existing conflict
        const updated = [...prev];
        updated[existingIndex] = conflict;
        return updated;
      }
      // Add new conflict
      return [...prev, conflict];
    });

    if (onConflictDetected) {
      onConflictDetected(conflict);
    }

    logger.warn('Conflict detected', {
      component: 'useConflictResolution',
      action: 'conflictDetected',
      metadata: {
        conflictId: conflict.conflictId,
        matchId: conflict.matchId,
        localVersion: conflict.localVersion,
        remoteVersion: conflict.remoteVersion,
      },
    });
  }, [onConflictDetected]);

  /**
   * Remove a conflict
   */
  const removeConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
    retryCountRef.current.delete(conflictId);
  }, []);

  /**
   * Fetch current match data
   */
  const fetchCurrentMatch = useCallback(async (matchId: string): Promise<Match | null> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) {
        logger.error('Failed to fetch current match', {
          component: 'useConflictResolution',
          action: 'fetchMatch',
          metadata: { matchId, error: error.message },
        }, new Error(error.message));
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching current match', {
        component: 'useConflictResolution',
        action: 'fetchMatch',
        metadata: { matchId },
      }, error as Error);
      return null;
    }
  }, []);

  /**
   * Apply resolution strategy
   */
  const applyResolutionStrategy = useCallback((
    conflict: ConflictInfo,
    strategy: ConflictResolutionStrategy
  ): Partial<MatchUpdate> => {
    const { localChanges, remoteChanges } = conflict;

    switch (strategy.name) {
      case 'latest-wins':
        // Use remote changes (most recent)
        return {
          ...remoteChanges,
          version: remoteChanges.version,
        };

      case 'user-wins':
        // Use local changes with updated version
        return {
          ...localChanges,
          version: conflict.remoteVersion,
        };

      case 'merge':
        if (strategy.mergeFunction) {
          return strategy.mergeFunction(localChanges, remoteChanges);
        }
        // Fallback to latest-wins if no merge function
        return {
          ...remoteChanges,
          version: remoteChanges.version,
        };

      case 'manual':
        // Return local changes but require manual resolution
        return {
          ...localChanges,
          version: conflict.remoteVersion,
        };

      default:
        throw new Error(`Unknown resolution strategy: ${strategy.name}`);
    }
  }, []);

  /**
   * Update match with optimistic locking
   */
  const updateMatch = useCallback(async (
    matchId: string,
    updates: Partial<MatchUpdate>
  ): Promise<{ success: boolean; conflict?: ConflictInfo }> => {
    try {
      logger.info('Updating match with conflict resolution', {
        component: 'useConflictResolution',
        action: 'updateMatch',
        metadata: { matchId, hasUpdates: Object.keys(updates).length > 0 },
      });

      // First, get current match data
      const currentMatch = await fetchCurrentMatch(matchId);
      if (!currentMatch) {
        throw new Error('Match not found');
      }

      // Prepare update with version check
      const updateData: MatchUpdate = {
        ...updates,
        version: currentMatch.version,
        updated_at: new Date().toISOString(),
      };

      // Attempt the update
      const { data, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .eq('version', currentMatch.version) // Optimistic lock
        .select()
        .single();

      if (error) {
        // Check if it's a version conflict
        if (error.message.includes('version') || error.code === '23505') {
          // Fetch the latest version to detect conflict
          const latestMatch = await fetchCurrentMatch(matchId);
          if (latestMatch && latestMatch.version > currentMatch.version) {
            const conflict: ConflictInfo = {
              conflictId: generateConflictId(),
              matchId,
              localVersion: currentMatch.version,
              remoteVersion: latestMatch.version,
              localChanges: updates,
              remoteChanges: latestMatch,
              timestamp: new Date(),
            };

            addConflict(conflict);

            // Try to auto-resolve with default strategy
            if (defaultStrategy.name !== 'manual') {
              const resolved = await resolveConflict(conflict.conflictId, defaultStrategy);
              if (resolved) {
                return { success: true };
              }
            }

            return { success: false, conflict };
          }
        }

        throw new Error(error.message);
      }

      logger.info('Match updated successfully', {
        component: 'useConflictResolution',
        action: 'updateSuccess',
        metadata: { matchId, newVersion: data.version },
      });

      monitor.recordMetric('match_update_success', 1, {
        component: 'useConflictResolution',
        match_id: matchId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to update match', {
        component: 'useConflictResolution',
        action: 'updateError',
        metadata: { matchId },
      }, error as Error);

      monitor.recordError(error as Error, {
        component: 'useConflictResolution',
        match_id: matchId,
      });

      throw error;
    }
  }, [fetchCurrentMatch, generateConflictId, addConflict, defaultStrategy]);

  /**
   * Resolve a specific conflict
   */
  const resolveConflict = useCallback(async (
    conflictId: string,
    strategy: ConflictResolutionStrategy
  ): Promise<boolean> => {
    const conflict = conflicts.find(c => c.conflictId === conflictId);
    if (!conflict) {
      logger.warn('Conflict not found for resolution', {
        component: 'useConflictResolution',
        action: 'resolveConflict',
        metadata: { conflictId },
      });
      return false;
    }

    try {
      logger.info('Resolving conflict', {
        component: 'useConflictResolution',
        action: 'resolveConflict',
        metadata: {
          conflictId,
          matchId: conflict.matchId,
          strategy: strategy.name,
        },
      });

      // Get current retry count
      const currentRetries = retryCountRef.current.get(conflictId) || 0;
      if (currentRetries >= maxRetries) {
        logger.error('Max retries exceeded for conflict resolution', {
          component: 'useConflictResolution',
          action: 'maxRetriesExceeded',
          metadata: { conflictId, retries: currentRetries },
        });
        
        if (onResolutionFailed) {
          onResolutionFailed(conflict, new Error('Max retries exceeded'));
        }
        
        return false;
      }

      // Increment retry count
      retryCountRef.current.set(conflictId, currentRetries + 1);

      // Apply resolution strategy
      const resolvedUpdate = applyResolutionStrategy(conflict, strategy);

      // Attempt to update with resolved data
      const result = await updateMatch(conflict.matchId, resolvedUpdate);

      if (result.success) {
        removeConflict(conflictId);
        
        if (onConflictResolved) {
          onConflictResolved(conflict, strategy);
        }

        logger.info('Conflict resolved successfully', {
          component: 'useConflictResolution',
          action: 'conflictResolved',
          metadata: {
            conflictId,
            matchId: conflict.matchId,
            strategy: strategy.name,
            retries: currentRetries,
          },
        });

        monitor.recordMetric('conflict_resolution_success', 1, {
          component: 'useConflictResolution',
          strategy: strategy.name,
          retries: currentRetries,
        });

        return true;
      } else if (result.conflict) {
        // New conflict detected during resolution
        // Update the existing conflict with new data
        const updatedConflict: ConflictInfo = {
          ...conflict,
          remoteVersion: result.conflict.remoteVersion,
          remoteChanges: result.conflict.remoteChanges,
          timestamp: new Date(),
        };
        
        addConflict(updatedConflict);
        return false;
      }

      return false;
    } catch (error) {
      logger.error('Error resolving conflict', {
        component: 'useConflictResolution',
        action: 'resolveError',
        metadata: { conflictId, matchId: conflict.matchId },
      }, error as Error);

      if (onResolutionFailed) {
        onResolutionFailed(conflict, error as Error);
      }

      monitor.recordError(error as Error, {
        component: 'useConflictResolution',
        conflict_id: conflictId,
        match_id: conflict.matchId,
      });

      return false;
    }
  }, [conflicts, maxRetries, applyResolutionStrategy, updateMatch, removeConflict, onConflictResolved, onResolutionFailed, addConflict]);

  /**
   * Dismiss a conflict without resolving
   */
  const dismissConflict = useCallback((conflictId: string) => {
    removeConflict(conflictId);
    
    logger.info('Conflict dismissed', {
      component: 'useConflictResolution',
      action: 'dismissConflict',
      metadata: { conflictId },
    });
  }, [removeConflict]);

  /**
   * Clear all conflicts
   */
  const clearConflicts = useCallback(() => {
    setConflicts([]);
    retryCountRef.current.clear();
    
    logger.info('All conflicts cleared', {
      component: 'useConflictResolution',
      action: 'clearConflicts',
    });
  }, []);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    updateMatch,
    resolveConflict,
    dismissConflict,
    clearConflicts,
  };
}

/**
 * Hook for simple match updates with automatic conflict resolution
 */
export function useOptimisticMatchUpdate(defaultStrategy: ConflictResolutionStrategy = { name: 'latest-wins' }) {
  const { updateMatch, conflicts, resolveConflict } = useConflictResolution({
    defaultStrategy,
  });

  const updateMatchOptimistic = useCallback(async (
    matchId: string,
    updates: Partial<MatchUpdate>
  ): Promise<boolean> => {
    try {
      const result = await updateMatch(matchId, updates);
      if (result.success) {
        return true;
      }
      
      // If conflict exists and not manual strategy, try to auto-resolve
      if (result.conflict && defaultStrategy.name !== 'manual') {
        return await resolveConflict(result.conflict.conflictId, defaultStrategy);
      }
      
      return false;
    } catch {
      return false;
    }
  }, [updateMatch, resolveConflict, defaultStrategy]);

  return {
    updateMatch: updateMatchOptimistic,
    conflicts,
    resolveConflict,
  };
}