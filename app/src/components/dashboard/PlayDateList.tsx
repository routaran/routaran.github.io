import React from 'react';
import { PlayDateCard } from './PlayDateCard';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { PlayDateWithStats } from '../../lib/supabase/playDates';
import type { SupabaseError } from '../../lib/supabase/errors';
import { CalendarPlus, RefreshCw } from 'lucide-react';

export interface PlayDateListProps {
  playDates: PlayDateWithStats[];
  isLoading: boolean;
  error: SupabaseError | null;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onEdit?: (playDate: PlayDateWithStats) => void;
  onCreateNew?: () => void;
  canCreate?: boolean;
  emptyStateMessage?: string;
}

export function PlayDateList({
  playDates,
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore = false,
  onEdit,
  onCreateNew,
  canCreate = false,
  emptyStateMessage = "No play dates found. Create your first one to get started!",
}: PlayDateListProps) {
  // Empty state
  if (!isLoading && playDates.length === 0 && !error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <CalendarPlus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Play Dates Yet
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {emptyStateMessage}
        </p>
        {canCreate && onCreateNew && (
          <Button
            onClick={onCreateNew}
            icon={<CalendarPlus className="w-4 h-4" />}
          >
            Create Play Date
          </Button>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <RefreshCw className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to Load Play Dates
        </h3>
        <p className="text-gray-500 mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Loading state for initial load
  if (isLoading && playDates.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="text-center space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-9 bg-gray-200 rounded flex-1"></div>
                <div className="h-9 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Play date cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playDates.map((playDate) => (
          <PlayDateCard
            key={playDate.id}
            playDate={playDate}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button
            onClick={onLoadMore}
            variant="outline"
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}