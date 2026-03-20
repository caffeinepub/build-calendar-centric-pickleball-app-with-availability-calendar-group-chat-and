import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AllTimeStats,
  Availability,
  BadgeDefinition,
  DayAvailabilityCount,
  DayWithLog,
  IndividualMatchResult,
  Notification,
  Post,
  ReactionType,
  UserProfile,
  T as UserStats,
} from "../backend";
import type { ExternalBlob } from "../backend";
import { useActor } from "./useActor";

export function useGetAllUserProfiles() {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, UserProfile>>({
    queryKey: ["allUserProfiles"],
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
    queryKey: ["userProfile", principal?.toString()],
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
    queryKey: ["leaderboard"],
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
    queryKey: ["dayAvailability", day?.toString()],
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
    queryKey: ["hasAvailability", day?.toString()],
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
    queryKey: [
      "daysWithAnyAvailability",
      days.map((d) => d.toString()).join(","),
    ],
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

export function useGetAllDayAvailabilityCounts() {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, number>>({
    queryKey: ["allDayAvailabilityCounts"],
    queryFn: async () => {
      if (!actor) return new Map();
      const counts = await actor.getAllDayAvailabilityCounts();
      const map = new Map<string, number>();
      for (const entry of counts as DayAvailabilityCount[]) {
        map.set(entry.day.toString(), Number(entry.count));
      }
      return map;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerAvailability(day: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Availability | null>({
    queryKey: ["callerAvailability", day?.toString()],
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
    queryKey: ["callerAvailableDays"],
    queryFn: async () => {
      if (!actor) return [];
      const daysWithLogs = await actor.getCallerAvailableDaysWithLogs();
      const days = daysWithLogs.map((entry) => entry.day);
      return days.sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerMatchHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<DayWithLog[]>({
    queryKey: ["callerMatchHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallerAvailableDaysWithLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerStats() {
  const { actor, isFetching } = useActor();

  return useQuery<UserStats | null>({
    queryKey: ["callerStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserStats(user: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserStats | null>({
    queryKey: ["userStats", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserStats(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

/**
 * Returns the AllTimeStats for a specific user by finding their entry in the
 * all-time leaderboard. This is the correct source for all-time best streak.
 */
export function useGetUserAllTimeStats(user: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<AllTimeStats | null>({
    queryKey: ["userAllTimeStats", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      const allTime = await actor.getAllTimeLeaderboard();
      const userStr = user.toString();
      const entry = allTime.find(([p]) => p.toString() === userStr);
      return entry ? entry[1] : null;
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useGetIndividualResults(user: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<IndividualMatchResult[]>({
    queryKey: ["individualResults", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getIndividualResults(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useAddAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      day,
      time,
      notes,
    }: { day: bigint; time: string; notes: string | null }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addAvailability(day, time, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hasAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["daysWithAnyAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["allDayAvailabilityCounts"] });
      queryClient.invalidateQueries({
        queryKey: ["dayAvailability", variables.day.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["callerAvailability", variables.day.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["callerAvailableDays"] });
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
    },
  });
}

export function useDeleteCallerDayAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCallerDayAvailability(day);
    },
    onSuccess: (_, day) => {
      queryClient.invalidateQueries({ queryKey: ["hasAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["daysWithAnyAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["allDayAvailabilityCounts"] });
      queryClient.invalidateQueries({
        queryKey: ["dayAvailability", day.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["callerAvailability", day.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["callerAvailableDays"] });
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
    },
  });
}

// Admin queries
export function useGetAllRegisteredUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, UserProfile, bigint]>>({
    queryKey: ["allRegisteredUsers"],
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
    queryKey: ["allAvailabilities"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAvailabilities();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllLoginTimestamps() {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, bigint>>({
    queryKey: ["allLoginTimestamps"],
    queryFn: async () => {
      if (!actor) return new Map();
      const timestamps = await actor.getAllLoginTimestamps();
      const map = new Map<string, bigint>();
      for (const [principal, timestamp] of timestamps) {
        map.set(principal.toString(), timestamp);
      }
      return map;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToDelete: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteUser(userToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRegisteredUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allAvailabilities"] });
      queryClient.invalidateQueries({ queryKey: ["allLoginTimestamps"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useDeleteUserDayAvailability() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, day }: { user: Principal; day: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteUserDayAvailability(user, day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAvailabilities"] });
      queryClient.invalidateQueries({ queryKey: ["allDayAvailabilityCounts"] });
      queryClient.invalidateQueries({ queryKey: ["dayAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["daysWithAnyAvailability"] });
    },
  });
}

// Chat/Posts queries
export function useGetPosts(limit = 100n, offset = 0n) {
  const { actor, isFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["posts", limit.toString(), offset.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPosts(limit, offset);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useGetTotalPostCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["totalPostCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalPostCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      parentId,
      image,
    }: {
      content: string;
      parentId: bigint | null;
      image: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addPost(content, parentId, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useEditPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      newContent,
    }: { postId: bigint; newContent: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.editPost(postId, newContent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useAddReaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      reactionType,
    }: { postId: bigint; reactionType: ReactionType }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addReaction(postId, reactionType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useRemoveReaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.removeReaction(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useRecordDailyWin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordDailyWin(day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userBadges"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useRecordDailyLoss() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordDailyLoss(day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userBadges"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useDecrementDailyLog() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ day, isWin }: { day: bigint; isWin: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.decrementDailyLog(day, isWin);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useRemoveDailyWin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.decrementDailyLog(day, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useRemoveDailyLoss() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (day: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.decrementDailyLog(day, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useInitializeCallerLeaderboard() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordLoginTime();
    },
  });
}

// Badge queries
export function useGetAllBadgeDefinitions() {
  const { actor, isFetching } = useActor();

  return useQuery<BadgeDefinition[]>({
    queryKey: ["badgeDefinitions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBadgeDefinitions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserBadges(user: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["userBadges", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getUserBadges(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useCreateBadgeDefinition() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (definition: BadgeDefinition) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createBadgeDefinition(definition);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badgeDefinitions"] });
      queryClient.invalidateQueries({ queryKey: ["userBadges"] });
    },
  });
}

export function useUpdateBadgeDefinition() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (definition: BadgeDefinition) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBadgeDefinition(definition);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badgeDefinitions"] });
      queryClient.invalidateQueries({ queryKey: ["userBadges"] });
    },
  });
}

export function useDeleteBadgeDefinition() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (definitionId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteBadgeDefinition(definitionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badgeDefinitions"] });
      queryClient.invalidateQueries({ queryKey: ["userBadges"] });
    },
  });
}

export function useAwardBadgeToUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      badgeId,
    }: { user: Principal; badgeId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.awardBadgeToUser(user, badgeId);
    },
    onSuccess: (_, { user }) => {
      queryClient.invalidateQueries({
        queryKey: ["userBadges", user.toString()],
      });
    },
  });
}

export function useRevokeBadgeFromUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      badgeId,
    }: { user: Principal; badgeId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.revokeBadgeFromUser(user, badgeId);
    },
    onSuccess: (_, { user }) => {
      queryClient.invalidateQueries({
        queryKey: ["userBadges", user.toString()],
      });
    },
  });
}

// Seasonal leaderboard queries
export function useGetCurrentSeasonLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, UserStats]>>({
    queryKey: ["currentSeasonLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCurrentSeasonLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllTimeLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, AllTimeStats]>>({
    queryKey: ["getAllTimeLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTimeLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPastSeasonSnapshots() {
  const { actor, isFetching } = useActor();

  return useQuery<
    Array<{ year: bigint; leaderboard: Array<[Principal, UserStats]> }>
  >({
    queryKey: ["pastSeasonSnapshots"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPastSeasonSnapshots();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useFinalizeCurrentSeason() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (year: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.finalizeCurrentSeason(year);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["pastSeasonSnapshots"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
    },
  });
}

// ─── Notification queries ──────────────────────────────────────────────────────

export function useGetMyNotifications() {
  const { actor, isFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ["myNotifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGetUnreadNotificationCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["unreadNotificationCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notifId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markNotificationRead(notifId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

// ─── Rank history queries ──────────────────────────────────────────────────────

export function useGetMyRankHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[bigint, bigint]>>({
    queryKey: ["myRankHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyRankHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecalculateAllUserStats() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).recalculateAllUserStats();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["callerMatchHistory"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

// ─── Streak management (admin) ─────────────────────────────────────────────────

export function useResetUserCurrentStreak() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.resetUserCurrentStreak(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["currentSeasonLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
    },
  });
}

export function useResetUserBestStreak() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: Principal) => {
      if (!actor) throw new Error("Actor not available");
      return actor.resetUserBestStreak(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["getAllTimeLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["callerStats"] });
      queryClient.invalidateQueries({ queryKey: ["userAllTimeStats"] });
    },
  });
}

export function useGetCallerAllTimeColdStreak() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["callerAllTimeColdStreak"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getCallerAllTimeColdStreak();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserAllTimeColdStreak(user: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["userAllTimeColdStreak", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return 0n;
      return actor.getUserAllTimeColdStreak(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}
