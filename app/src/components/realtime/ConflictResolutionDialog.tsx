import React, { useState } from 'react';
import { useConflictResolution, type ConflictInfo, type ConflictResolutionStrategy } from '../../hooks/useConflictResolution';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export interface ConflictResolutionDialogProps {
  /** Conflict to resolve */
  conflict: ConflictInfo;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when conflict is resolved */
  onResolved: (strategy: ConflictResolutionStrategy) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Dialog for resolving optimistic locking conflicts
 */
export function ConflictResolutionDialog({
  conflict,
  open,
  onClose,
  onResolved,
  className,
}: ConflictResolutionDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>({ name: 'latest-wins' });
  const [isResolving, setIsResolving] = useState(false);

  if (!open) return null;

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolved(selectedStrategy);
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  const strategies: ConflictResolutionStrategy[] = [
    { name: 'latest-wins' },
    { name: 'user-wins' },
    { name: 'merge' },
  ];

  const strategyDescriptions = {
    'latest-wins': 'Use the most recent version from the server',
    'user-wins': 'Keep your local changes',
    'merge': 'Attempt to merge both versions',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className={cn('max-w-2xl w-full max-h-[90vh] overflow-y-auto', className)}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Conflict Resolution Required
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Someone else has updated this match. Choose how to resolve the conflict.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>

          {/* Conflict details */}
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm font-medium text-yellow-800">
                  Version Conflict Detected
                </span>
              </div>
              <div className="text-sm text-yellow-700">
                Match ID: {conflict.matchId}
              </div>
              <div className="text-sm text-yellow-700">
                Your version: {conflict.localVersion} → Server version: {conflict.remoteVersion}
              </div>
            </div>
          </div>

          {/* Changes comparison */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Changes Comparison</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Your changes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">Your Changes</Badge>
                  <span className="text-sm text-gray-600">Version {conflict.localVersion}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="space-y-1">
                    {Object.entries(conflict.localChanges).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-blue-800">{key}:</span>{' '}
                        <span className="text-blue-700">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Server changes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning">Server Changes</Badge>
                  <span className="text-sm text-gray-600">Version {conflict.remoteVersion}</span>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="space-y-1">
                    {Object.entries(conflict.remoteChanges).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-orange-800">{key}:</span>{' '}
                        <span className="text-orange-700">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution strategies */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Resolution Strategy</h3>
            <div className="space-y-3">
              {strategies.map((strategy) => (
                <label
                  key={strategy.name}
                  className={cn(
                    'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                    selectedStrategy.name === strategy.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.name}
                    checked={selectedStrategy.name === strategy.name}
                    onChange={(e) => setSelectedStrategy({ name: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 capitalize">
                      {strategy.name.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {strategyDescriptions[strategy.name]}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview of resolution */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Preview Result</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-2">
                After resolution with "{selectedStrategy.name}":
              </div>
              <div className="space-y-1">
                {selectedStrategy.name === 'latest-wins' && (
                  <div className="text-sm">
                    <span className="text-gray-700">
                      All server changes will be kept. Your local changes will be discarded.
                    </span>
                  </div>
                )}
                {selectedStrategy.name === 'user-wins' && (
                  <div className="text-sm">
                    <span className="text-gray-700">
                      Your local changes will be kept. Server changes will be overwritten.
                    </span>
                  </div>
                )}
                {selectedStrategy.name === 'merge' && (
                  <div className="text-sm">
                    <span className="text-gray-700">
                      Both sets of changes will be merged. This may result in unexpected values.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving}
              className="min-w-[120px]"
            >
              {isResolving ? 'Resolving...' : 'Resolve Conflict'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Props for conflict resolution manager
 */
export interface ConflictResolutionManagerProps {
  /** Custom class name */
  className?: string;
  /** Maximum number of conflicts to show */
  maxConflicts?: number;
  /** Auto-resolve strategy for non-critical conflicts */
  autoResolveStrategy?: ConflictResolutionStrategy;
}

/**
 * Manager component that handles multiple conflicts
 */
export function ConflictResolutionManager({
  className,
  maxConflicts = 5,
  autoResolveStrategy,
}: ConflictResolutionManagerProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  const { conflicts, resolveConflict, dismissConflict } = useConflictResolution({
    defaultStrategy: autoResolveStrategy,
  });

  const handleConflictClick = (conflict: ConflictInfo) => {
    setSelectedConflict(conflict);
  };

  const handleResolved = async (strategy: ConflictResolutionStrategy) => {
    if (selectedConflict) {
      await resolveConflict(selectedConflict.conflictId, strategy);
      setSelectedConflict(null);
    }
  };

  const handleDismiss = (conflictId: string) => {
    dismissConflict(conflictId);
  };

  // Show limited number of conflicts
  const displayConflicts = conflicts.slice(0, maxConflicts);

  if (displayConflicts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Conflict list */}
      <div className="space-y-2">
        {displayConflicts.map((conflict) => (
          <div
            key={conflict.conflictId}
            className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm font-medium text-yellow-800">
                  Conflict in Match {conflict.matchId}
                </span>
              </div>
              <div className="text-xs text-yellow-700">
                Version {conflict.localVersion} → {conflict.remoteVersion}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConflictClick(conflict)}
                className="text-yellow-700 hover:text-yellow-800"
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(conflict.conflictId)}
                className="text-yellow-700 hover:text-yellow-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Show if there are more conflicts */}
      {conflicts.length > maxConflicts && (
        <div className="text-sm text-gray-600 text-center">
          And {conflicts.length - maxConflicts} more conflicts...
        </div>
      )}

      {/* Resolution dialog */}
      {selectedConflict && (
        <ConflictResolutionDialog
          conflict={selectedConflict}
          open={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

/**
 * Compact conflict indicator for headers/navigation
 */
export function ConflictIndicator({ className }: { className?: string }) {
  const { conflicts } = useConflictResolution();
  const [showManager, setShowManager] = useState(false);

  if (conflicts.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowManager(!showManager)}
        className="text-yellow-700 hover:text-yellow-800"
      >
        <span className="text-yellow-600">⚠️</span>
        <span className="ml-1">{conflicts.length} Conflicts</span>
      </Button>

      {showManager && (
        <div className="absolute top-full right-0 mt-2 w-96 z-50">
          <ConflictResolutionManager />
        </div>
      )}
    </div>
  );
}