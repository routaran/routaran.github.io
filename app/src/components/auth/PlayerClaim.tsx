import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Select } from '../common/Form';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { db, supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useToast } from '../../hooks/useToast';
import type { Player } from '../../types/database';

interface PlayerClaimProps {
  onSuccess: () => void;
}

export function PlayerClaim({ onSuccess }: PlayerClaimProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const { claimPlayer } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUnclaimedPlayers();
  }, []);

  const loadUnclaimedPlayers = async () => {
    try {
      logger.info('Loading unclaimed players', {
        component: 'PlayerClaim',
        action: 'loadPlayers',
      });

      // Get all players without a claim
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .is('claim_user_id', null)
        .order('name');

      if (error) throw error;

      logger.info('Loaded unclaimed players', {
        component: 'PlayerClaim',
        action: 'loadPlayers',
        metadata: { count: data?.length || 0 },
      });

      setPlayers(data || []);
      
      // Auto-select if only one player available
      if (data && data.length === 1) {
        setSelectedPlayerId(data[0].id);
      }
    } catch (error) {
      logger.error('Failed to load unclaimed players', {
        component: 'PlayerClaim',
        action: 'loadPlayers',
      }, error as Error);

      toast({
        title: 'Failed to load players',
        description: 'Unable to load available players. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!selectedPlayerId) {
      toast({
        title: 'Select a player',
        description: 'Please select your name from the list',
        variant: 'destructive',
      });
      return;
    }

    setIsClaiming(true);

    try {
      logger.info('Attempting to claim player', {
        component: 'PlayerClaim',
        action: 'claimPlayer',
        metadata: { playerId: selectedPlayerId },
      });

      await claimPlayer(selectedPlayerId);

      logger.info('Player claimed successfully', {
        component: 'PlayerClaim',
        action: 'claimPlayer',
        metadata: { playerId: selectedPlayerId },
      });

      toast({
        title: 'Welcome!',
        description: 'Your player profile has been linked to your account.',
        variant: 'success',
      });

      onSuccess();
    } catch (error) {
      logger.error('Failed to claim player', {
        component: 'PlayerClaim',
        action: 'claimPlayer',
        metadata: { playerId: selectedPlayerId },
      }, error as Error);

      toast({
        title: 'Claim failed',
        description: error instanceof Error ? error.message : 'Unable to claim player. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
          <svg
            className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          No players available
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          All players have been claimed or no tournaments are active.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please contact your tournament organizer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Welcome! Who are you?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select your name to link it to your account
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="player" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Your name
          </label>
          <Select
            id="player"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            disabled={isClaiming}
            className="w-full"
            aria-label="Select your player name"
            placeholder="Select your name..."
            options={players.map((player) => ({
              value: player.id,
              label: player.name,
              disabled: false
            }))}
          />
        </div>

        <Button
          onClick={handleClaim}
          variant="primary"
          size="lg"
          disabled={!selectedPlayerId || isClaiming}
          loading={isClaiming}
          className="w-full"
        >
          {isClaiming ? 'Claiming...' : 'Claim player'}
        </Button>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Don't see your name?{' '}
            <span className="font-medium">Contact your tournament organizer</span>
          </p>
        </div>
      </div>
    </div>
  );
}