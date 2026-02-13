import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import type { Principal } from '@dfinity/principal';
import type { T as UserStats } from '../backend';

// Hook for availability notifications on Calendar/Day Detail pages
export function useAvailabilityNotifications(day: bigint | null, enabled: boolean) {
  const { actor, isFetching } = useActor();
  const previousCountRef = useRef<number | null>(null);
  const previousPrincipalsRef = useRef<Set<string>>(new Set());

  const { data: availabilities = [] } = useQuery<Array<[Principal, any]>>({
    queryKey: ['dayAvailability', day?.toString()],
    queryFn: async () => {
      if (!actor || day === null) return [];
      return actor.getDayAvailability(day);
    },
    enabled: !!actor && !isFetching && day !== null && enabled,
    refetchInterval: enabled ? 10000 : false, // Poll every 10 seconds when enabled
  });

  useEffect(() => {
    if (!enabled || availabilities.length === 0) return;

    const currentPrincipals = new Set(availabilities.map(([p]) => p.toString()));

    // Initialize on first load
    if (previousCountRef.current === null) {
      previousCountRef.current = availabilities.length;
      previousPrincipalsRef.current = currentPrincipals;
      return;
    }

    // Check for new principals (not just count change)
    const newPrincipals = Array.from(currentPrincipals).filter(
      p => !previousPrincipalsRef.current.has(p)
    );

    if (newPrincipals.length > 0) {
      toast.info('New availability added by another user!', {
        duration: 4000,
      });
    }

    previousCountRef.current = availabilities.length;
    previousPrincipalsRef.current = currentPrincipals;
  }, [availabilities, enabled]);

  // Reset when disabled or day changes
  useEffect(() => {
    if (!enabled) {
      previousCountRef.current = null;
      previousPrincipalsRef.current = new Set();
    }
  }, [enabled, day]);
}

// Hook for leaderboard rank improvement notifications
export function useLeaderboardRankNotifications(enabled: boolean, callerPrincipal: string | undefined) {
  const { actor, isFetching } = useActor();
  const previousRankRef = useRef<number | null>(null);

  const { data: leaderboard = [] } = useQuery<Array<[Principal, UserStats]>>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching && enabled,
    refetchInterval: enabled ? 15000 : false, // Poll every 15 seconds when enabled
  });

  useEffect(() => {
    if (!enabled || !callerPrincipal || leaderboard.length === 0) return;

    const currentRank = leaderboard.findIndex(([p]) => p.toString() === callerPrincipal);

    // User not found in leaderboard
    if (currentRank === -1) {
      previousRankRef.current = null;
      return;
    }

    const currentRankPosition = currentRank + 1; // Convert to 1-based

    // Initialize on first load
    if (previousRankRef.current === null) {
      previousRankRef.current = currentRankPosition;
      return;
    }

    // Check for rank improvement (lower number = better rank)
    if (currentRankPosition < previousRankRef.current) {
      const improvement = previousRankRef.current - currentRankPosition;
      const message = improvement === 1 
        ? 'You moved up 1 spot on the leaderboard! 🎉'
        : `You moved up ${improvement} spots on the leaderboard! 🎉`;
      
      toast.success(message, {
        duration: 5000,
      });
    }

    previousRankRef.current = currentRankPosition;
  }, [leaderboard, enabled, callerPrincipal]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      previousRankRef.current = null;
    }
  }, [enabled]);
}
