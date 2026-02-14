import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, T as UserStats, Availability, DayWithLog } from '../backend';
import type { Principal } from '@dfinity/principal';

export function useGetAllUserProfiles() {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, UserProfile>>({
    queryKey: ['allUserProfiles'],
    queryFn: async () => {
      if (!actor) return new Map();
      return new Map();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserProfile(principal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, UserStats]>>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDayAvailability(day: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, Availability]>>({
    queryKey: ['dayAvailability', day?.toString()],
    queryFn: async () => {
      if (!actor || day === null) return [];
      return actor.getDayAvailability(day);
    },
    enabled: !!actor && !isFetching && day !== null,
  });
}

export function useHasAvailability(day: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['hasAvailability', day?.toString()],
    queryFn: async () => {
      if (!actor || day === null) return false;
      return actor.hasAvailability(day);
    },
    enabled: !!actor && !isFetching && day !== null,
  });
}

export function useDaysWithAnyAvailability(days: bigint[]) {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, boolean>>({
    queryKey: ['daysWithAnyAvailability', days.map(d => d.toString()).join(',')],
    queryFn: async () => {
      if (!actor || days.length === 0) return new Map();
      const results = await actor.daysWithAnyAvailability(days);
      const map = new Map<string, boolean>();
      days.forEach((day, index) => {
        map.set(day.toString(), results[index]);
      });
      return map;
    },
    enabled: !!actor && !isFetching && days.length > 0,
  });
}

export function useGetCallerAvailability(day: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Availability | null>({
    queryKey: ['callerAvailability', day?.toString()],
    queryFn: async () => {
      if (!actor || day === null) return null;
      return actor.getCallerAvailability(day);
    },
    enabled: !!actor && !isFetching && day !== null,
  });
}

export function useGetCallerAvailableDays() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint[]>({
    queryKey: ['callerAvailableDays'],
    queryFn: async () => {
      if (!actor) return [];
      const daysWithLogs = await actor.getCallerAvailableDaysWithLogs();
      return daysWithLogs.map(entry => entry.day);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerMatchHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<DayWithLog[]>({
    queryKey: ['callerMatchHistory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerAvailableDaysWithLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ day, time, notes }: { day: bigint; time: string; notes: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addAvailability(day, time, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hasAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['daysWithAnyAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['dayAvailability', variables.day.toString()] });
      queryClient.invalidateQueries({ queryKey: ['callerAvailability', variables.day.toString()] });
      queryClient.invalidateQueries({ queryKey: ['callerAvailableDays'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useDeleteCallerDayAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCallerDayAvailability(day);
    },
    onSuccess: (_, day) => {
      queryClient.invalidateQueries({ queryKey: ['hasAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['daysWithAnyAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['dayAvailability', day.toString()] });
      queryClient.invalidateQueries({ queryKey: ['callerAvailability', day.toString()] });
      queryClient.invalidateQueries({ queryKey: ['callerAvailableDays'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useGetRecentMessages(limit: bigint = 100n) {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, string, bigint]>>({
    queryKey: ['recentMessages', limit.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentMessages(limit);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendMessage(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentMessages'] });
    },
  });
}

export function useGetCallerStats() {
  const { actor, isFetching } = useActor();

  return useQuery<UserStats | null>({
    queryKey: ['callerStats'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecordDailyWin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordDailyWin(day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useRecordDailyLoss() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordDailyLoss(day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useRemoveDailyWin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.decrementDailyLog(day, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useRemoveDailyLoss() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.decrementDailyLog(day, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['callerMatchHistory'] });
    },
  });
}

export function useInitializeCallerLeaderboard() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.recordLoginTime();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callerStats'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useGetAllRegisteredUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, UserProfile, bigint]>>({
    queryKey: ['allRegisteredUsers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRegisteredUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllAvailabilities() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, bigint, string]>>({
    queryKey: ['allAvailabilities'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAvailabilities();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToDelete: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUser(userToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRegisteredUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['dayAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['daysWithAnyAvailability'] });
    },
  });
}

export function useDeleteUserDayAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, day }: { user: Principal; day: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUserDayAvailability(user, day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAvailabilities'] });
      queryClient.invalidateQueries({ queryKey: ['dayAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['daysWithAnyAvailability'] });
    },
  });
}
