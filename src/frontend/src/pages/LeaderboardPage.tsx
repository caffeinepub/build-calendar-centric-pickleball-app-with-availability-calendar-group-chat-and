import type { Principal } from "@dfinity/principal";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { BadgeDefinition, DayWithLog } from "../backend";
import { NotificationCategory } from "../backend";
import type { T as UserStats } from "../backend";
import SeasonChampionBadge from "../components/badges/SeasonChampionBadge";
import { Page, PageHeader } from "../components/layout/PageLayout";
import PlayerProfileModal from "../components/leaderboard/PlayerProfileModal";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import AvatarName from "../components/user/AvatarName";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllBadgeDefinitions,
  useGetAllTimeLeaderboard,
  useGetCallerAvailableDays,
  useGetCallerMatchHistory,
  useGetCurrentSeasonLeaderboard,
  useGetLeaderboard,
  useGetMyNotifications,
  useGetPastSeasonSnapshots,
  useGetUserBadges,
  useMarkNotificationRead,
  useRecalculateAllUserStats,
  useRecordDailyLoss,
  useRecordDailyWin,
  useRemoveDailyLoss,
  useRemoveDailyWin,
} from "../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../hooks/useUserDirectory";
import { formatDayId, getDayId } from "../lib/date";

// ─── LeaderboardPlayerCell ────────────────────────────────────────────────────

interface LeaderboardPlayerCellProps {
  principal: Principal;
  displayName: string;
  avatarUrl?: string;
  allBadgeDefinitions: BadgeDefinition[];
  isCurrentUser: boolean;
}

function LeaderboardPlayerCell({
  principal,
  displayName,
  avatarUrl,
  allBadgeDefinitions,
  isCurrentUser,
}: LeaderboardPlayerCellProps) {
  const { data: userBadgeIds = [] } = useGetUserBadges(principal);

  return (
    <div className="flex items-center gap-1">
      <AvatarName
        principal={principal}
        displayName={displayName}
        avatarUrl={avatarUrl}
        size="sm"
      />
      <SeasonChampionBadge
        earnedBadgeIds={userBadgeIds}
        allDefinitions={allBadgeDefinitions}
      />
      {isCurrentUser && (
        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
      )}
    </div>
  );
}

/** Returns days remaining until Dec 31 of current year */
function getDaysRemainingInSeason(): number {
  const today = new Date();
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(
    0,
    Math.ceil((yearEnd.getTime() - today.getTime()) / msPerDay),
  );
}

// ─── Leaderboard table shared component ──────────────────────────────────────

interface LeaderboardTableProps {
  leaderboard: Array<[Principal, UserStats]>;
  isLoading: boolean;
  callerPrincipal?: string;
  rankChanges?: Map<string, "up" | "down" | "same">;
  onPlayerClick?: (principal: Principal) => void;
  userDirectory?: Map<string, { displayName: string; avatarUrl?: string }>;
  isLoadingDirectory?: boolean;
  allBadgeDefinitions?: BadgeDefinition[];
}

function LeaderboardTable({
  leaderboard,
  isLoading,
  callerPrincipal,
  rankChanges,
  onPlayerClick,
  userDirectory,
  isLoadingDirectory,
  allBadgeDefinitions = [],
}: LeaderboardTableProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">
          🥇 #1
        </Badge>
      );
    if (rank === 2)
      return (
        <Badge className="bg-gray-400 text-white hover:bg-gray-400">
          🥈 #2
        </Badge>
      );
    if (rank === 3)
      return (
        <Badge className="bg-amber-600 text-white hover:bg-amber-600">
          🥉 #3
        </Badge>
      );
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getWinRate = (wins: bigint, losses: bigint): string => {
    const total = Number(wins) + Number(losses);
    if (total === 0) return "—";
    return `${Math.round((Number(wins) / total) * 100)}%`;
  };

  if (isLoading || isLoadingDirectory) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">W</TableHead>
            <TableHead className="text-right">L</TableHead>
            <TableHead className="text-right">GP</TableHead>
            <TableHead className="text-right">Win%</TableHead>
            <TableHead className="text-right">Streak</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TableRow key={i} data-ocid="leaderboard.loading_state">
              <TableCell>
                <Skeleton className="h-5 w-10 rounded-full" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-8 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-6 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        No players on the leaderboard yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">W</TableHead>
          <TableHead className="text-right">L</TableHead>
          <TableHead className="text-right">GP</TableHead>
          <TableHead className="text-right">Win%</TableHead>
          <TableHead className="text-right">Streak</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaderboard.map(([principal, stats], index) => {
          const rank = index + 1;
          const isCurrentUser = principal.toString() === callerPrincipal;
          const entry = userDirectory?.get(principal.toString());
          // Always use the streak value from stats directly.
          // For All Time, this will be bestStreakEver (mapped at the call site).
          // For Current Season, this is the current active streak.
          const displayStreak = Number(stats.streak);
          const gamesPlayed = Number(stats.wins) + Number(stats.losses);

          return (
            <TableRow
              key={principal.toString()}
              className={`cursor-pointer transition-colors hover:bg-muted/60 ${
                isCurrentUser ? "bg-primary/5 font-medium" : ""
              }`}
              onClick={() => onPlayerClick?.(principal)}
              data-ocid={`leaderboard.item.${rank}`}
            >
              <TableCell>
                <div className="flex items-center gap-1">
                  {getRankBadge(rank)}
                  {(() => {
                    const change = rankChanges?.get(principal.toString());
                    if (change === "up")
                      return (
                        <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                      );
                    if (change === "down")
                      return (
                        <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                      );
                    return null;
                  })()}
                </div>
              </TableCell>
              <TableCell>
                <LeaderboardPlayerCell
                  principal={principal}
                  displayName={
                    entry?.displayName ??
                    `${principal.toString().slice(0, 8)}...`
                  }
                  avatarUrl={entry?.avatarUrl}
                  allBadgeDefinitions={allBadgeDefinitions}
                  isCurrentUser={isCurrentUser}
                />
              </TableCell>
              <TableCell className="text-right text-green-600 font-medium">
                {Number(stats.wins)}
              </TableCell>
              <TableCell className="text-right text-red-500 font-medium">
                {Number(stats.losses)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {gamesPlayed}
              </TableCell>
              <TableCell className="text-right">
                {getWinRate(stats.wins, stats.losses)}
              </TableCell>
              <TableCell className="text-right">
                {displayStreak > 0 ? (
                  <span className="text-orange-500 font-medium">
                    🔥 {displayStreak}
                  </span>
                ) : displayStreak < 0 ? (
                  <span className="text-blue-500 font-medium">
                    ❄️ {Math.abs(displayStreak)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  // ── All hooks must be called unconditionally at the top level ─────────────
  const { data: leaderboard = [] } = useGetLeaderboard();
  const {
    data: currentSeasonLeaderboard = [],
    isLoading: isLoadingCurrentSeason,
  } = useGetCurrentSeasonLeaderboard();
  const { data: allTimeLeaderboardRaw = [], isLoading: isLoadingAllTime } =
    useGetAllTimeLeaderboard();
  const { data: pastSeasonSnapshots = [], isLoading: isLoadingPastSeasons } =
    useGetPastSeasonSnapshots();
  const { data: allBadgeDefinitions = [] } = useGetAllBadgeDefinitions();

  const principals = useMemo(
    () => leaderboard.map(([principal]) => principal),
    [leaderboard],
  );
  const { data: userDirectory, isLoading: isLoadingDirectory } =
    useUserDirectoryWithAvatars(principals);

  const { identity } = useInternetIdentity();
  const { isLoading: isLoadingDays, isFetched: isDaysFetched } =
    useGetCallerAvailableDays();
  const { mutate: recalculateStats } = useRecalculateAllUserStats();
  const hasRecalculated = useRef(false);

  useEffect(() => {
    if (!hasRecalculated.current) {
      hasRecalculated.current = true;
      recalculateStats();
    }
  }, [recalculateStats]);

  const { data: matchHistory = [] } = useGetCallerMatchHistory();
  const { mutate: recordWin, isPending: isRecordingWin } = useRecordDailyWin();
  const { mutate: recordLoss, isPending: isRecordingLoss } =
    useRecordDailyLoss();
  const { mutate: removeWin, isPending: isRemovingWin } = useRemoveDailyWin();
  const { mutate: removeLoss, isPending: isRemovingLoss } =
    useRemoveDailyLoss();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPlayerPrincipal, setSelectedPlayerPrincipal] =
    useState<Principal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(
    new Set(),
  );

  const callerPrincipal = identity?.getPrincipal().toString();
  const currentYear = new Date().getFullYear();
  const daysRemaining = getDaysRemainingInSeason();

  const { data: notifications = [] } = useGetMyNotifications();
  const { mutate: markNotifRead } = useMarkNotificationRead();
  const shownNotifIdsRef = useRef<Set<string>>(new Set());

  // ── Track previous leaderboard snapshot for rank change arrows ──────────
  // prevLeaderboardRef holds the last known sorted snapshot of currentSeasonLeaderboard
  const prevLeaderboardRef = useRef<Array<[Principal, UserStats]>>([]);

  // Compute rank changes by comparing positions in prev vs current snapshot.
  // lower index = closer to #1 = better = "up" (green arrow)
  // higher index = further from #1 = worse = "down" (red arrow)
  const rankChanges = useMemo(() => {
    const changes = new Map<string, "up" | "down" | "same">();
    const prev = prevLeaderboardRef.current;
    if (prev.length === 0 || currentSeasonLeaderboard.length === 0)
      return changes;

    const prevPositions = new Map<string, number>();
    for (let i = 0; i < prev.length; i++) {
      prevPositions.set(prev[i][0].toString(), i);
    }

    for (let i = 0; i < currentSeasonLeaderboard.length; i++) {
      const pStr = currentSeasonLeaderboard[i][0].toString();
      const prevIdx = prevPositions.get(pStr);
      if (prevIdx === undefined) {
        changes.set(pStr, "same");
      } else if (i < prevIdx) {
        // moved closer to #1 — improved
        changes.set(pStr, "up");
      } else if (i > prevIdx) {
        // moved further from #1 — worsened
        changes.set(pStr, "down");
      } else {
        changes.set(pStr, "same");
      }
    }
    return changes;
  }, [currentSeasonLeaderboard]);

  // After render, update the previous snapshot ref
  useEffect(() => {
    if (currentSeasonLeaderboard.length > 0) {
      prevLeaderboardRef.current = currentSeasonLeaderboard;
    }
  }, [currentSeasonLeaderboard]);

  // Track the caller's current rank for accurate toast messages
  const callerCurrentRankRef = useRef<number | null>(null);
  useEffect(() => {
    if (!callerPrincipal || currentSeasonLeaderboard.length === 0) return;
    const idx = currentSeasonLeaderboard.findIndex(
      ([p]) => p.toString() === callerPrincipal,
    );
    callerCurrentRankRef.current = idx >= 0 ? idx + 1 : null;
  }, [currentSeasonLeaderboard, callerPrincipal]);

  // Map AllTimeStats to UserStats shape — streak column shows bestStreakEver
  const allTimeLeaderboard: Array<[Principal, UserStats]> =
    allTimeLeaderboardRaw.map(([principal, ats]) => [
      principal,
      {
        wins: ats.wins,
        losses: ats.losses,
        totalGames: ats.totalGames,
        // Use bestStreakEver for both streak and bestStreak so the shared
        // LeaderboardTable always reads the correct all-time value.
        streak: ats.bestStreakEver,
        bestStreak: ats.bestStreakEver,
      } as UserStats,
    ]);

  // Sort match history newest-first, then filter to past dates only
  const sortedMatchHistory = [...matchHistory].sort((a, b) =>
    a.day > b.day ? -1 : a.day < b.day ? 1 : 0,
  );
  const today = getDayId(new Date());
  const pastMatchHistory = sortedMatchHistory.filter(
    (entry) => entry.day <= today,
  );

  // Stable ref for markNotifRead to avoid dep-array loop
  const markNotifReadRef = useRef(markNotifRead);
  useEffect(() => {
    markNotifReadRef.current = markNotifRead;
  }, [markNotifRead]);

  // Notification-based rank change toasts.
  // Arrow direction is derived from the leaderboard position comparison (rankChanges).
  // Toast rank number is derived from the actual current leaderboard position.
  useEffect(() => {
    if (notifications.length === 0) return;
    const rankNotifs = notifications.filter(
      (n) => n.category === NotificationCategory.rankChange,
    );
    for (const notif of rankNotifs) {
      const idStr = notif.id.toString();
      if (shownNotifIdsRef.current.has(idStr)) continue;
      shownNotifIdsRef.current.add(idStr);

      // Use the actual current rank from the leaderboard array (1-based index)
      const actualRank = callerCurrentRankRef.current;
      const rankLabel =
        actualRank !== null ? `#${actualRank}` : "a new position";

      if (
        notif.newRank !== undefined &&
        notif.oldRank !== undefined &&
        notif.newRank < notif.oldRank
      ) {
        // Rank number decreased → closer to #1 → improved
        toast.success(`Your rank improved to ${rankLabel}!`);
      } else if (
        notif.newRank !== undefined &&
        notif.oldRank !== undefined &&
        notif.newRank > notif.oldRank
      ) {
        // Rank number increased → further from #1 → worsened
        toast.error(`Your rank dropped to ${rankLabel}.`);
      }
      if (!notif.read) {
        markNotifReadRef.current(notif.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  // Auto-select the most recent past day when match history loads
  // biome-ignore lint/correctness/useExhaustiveDependencies: pastMatchHistory[0] used but length tracks list changes
  useEffect(() => {
    if (isDaysFetched && pastMatchHistory.length > 0 && !selectedDay) {
      setSelectedDay(pastMatchHistory[0].day.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDaysFetched, pastMatchHistory.length, selectedDay]);

  const isPending =
    isRecordingWin || isRecordingLoss || isRemovingWin || isRemovingLoss;

  const handleRecordWin = () => {
    if (!selectedDay) {
      toast.error("Please select a date first");
      return;
    }
    recordWin(BigInt(selectedDay), {
      onSuccess: () => toast.success("Win recorded successfully!"),
      onError: (error: any) => {
        toast.error(
          error?.message ||
            "Failed to record win. Make sure you are marked available for this date.",
        );
      },
    });
  };

  const handleRecordLoss = () => {
    if (!selectedDay) {
      toast.error("Please select a date first");
      return;
    }
    recordLoss(BigInt(selectedDay), {
      onSuccess: () => toast.success("Loss recorded successfully!"),
      onError: (error: any) => {
        toast.error(
          error?.message ||
            "Failed to record loss. Make sure you are marked available for this date.",
        );
      },
    });
  };

  const handleRemoveWin = () => {
    if (!selectedDay) {
      toast.error("Please select a date first");
      return;
    }
    const dayLog = matchHistory.find(
      (entry) => entry.day.toString() === selectedDay,
    );
    if (!dayLog || dayLog.wins === 0n) {
      toast.error("No wins to remove for this date");
      return;
    }
    removeWin(BigInt(selectedDay), {
      onSuccess: () => toast.success("Win removed successfully"),
      onError: (error: any) =>
        toast.error(error?.message || "Failed to remove win"),
    });
  };

  const handleRemoveLoss = () => {
    if (!selectedDay) {
      toast.error("Please select a date first");
      return;
    }
    const dayLog = matchHistory.find(
      (entry) => entry.day.toString() === selectedDay,
    );
    if (!dayLog || dayLog.losses === 0n) {
      toast.error("No losses to remove for this date");
      return;
    }
    removeLoss(BigInt(selectedDay), {
      onSuccess: () => toast.success("Loss removed successfully"),
      onError: (error: any) =>
        toast.error(error?.message || "Failed to remove loss"),
    });
  };

  const handlePlayerClick = (principal: Principal) => {
    setSelectedPlayerPrincipal(principal);
    setModalOpen(true);
  };

  const selectedDayLog = selectedDay
    ? matchHistory.find((entry) => entry.day.toString() === selectedDay)
    : null;

  const selectedPlayerMatchHistory: DayWithLog[] =
    selectedPlayerPrincipal?.toString() === callerPrincipal ? matchHistory : [];

  const toggleSeason = (year: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const sharedTableProps = {
    callerPrincipal,
    rankChanges,
    onPlayerClick: handlePlayerClick,
    userDirectory,
    isLoadingDirectory,
    allBadgeDefinitions,
  };

  return (
    <Page>
      <PageHeader icon={<Trophy className="h-5 w-5" />} title="Leaderboard" />

      {/* Record Match Result — always visible */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Record Match Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDays ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : pastMatchHistory.length === 0 ? (
            <Alert>
              <AlertDescription>
                You need to add availability dates before recording match
                results. Go to the Calendar tab to add your availability.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="select-date" className="text-sm font-medium">
                  Select Date
                </label>
                <Select
                  value={selectedDay ?? ""}
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger
                    id="select-date"
                    data-ocid="leaderboard.date.select"
                  >
                    <SelectValue placeholder="Choose a date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pastMatchHistory.map((entry) => (
                      <SelectItem
                        key={entry.day.toString()}
                        value={entry.day.toString()}
                      >
                        <span className="flex items-center gap-2">
                          {formatDayId(entry.day)}
                          {(entry.wins > 0n || entry.losses > 0n) && (
                            <span className="text-xs text-muted-foreground">
                              ({Number(entry.wins)}W / {Number(entry.losses)}L)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDayLog &&
                (selectedDayLog.wins > 0n || selectedDayLog.losses > 0n) && (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    Current for this date:{" "}
                    <span className="text-green-600 font-medium">
                      {Number(selectedDayLog.wins)} wins
                    </span>{" "}
                    /{" "}
                    <span className="text-red-500 font-medium">
                      {Number(selectedDayLog.losses)} losses
                    </span>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRecordWin}
                  disabled={isPending || !selectedDay}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-ocid="leaderboard.win.primary_button"
                >
                  {isRecordingWin ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Win
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleRecordLoss}
                  disabled={isPending || !selectedDay}
                  variant="destructive"
                  data-ocid="leaderboard.loss.primary_button"
                >
                  {isRecordingLoss ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Loss
                    </span>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRemoveWin}
                  disabled={isPending || !selectedDay}
                  variant="outline"
                  size="sm"
                  data-ocid="leaderboard.win.secondary_button"
                >
                  {isRemovingWin ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Minus className="h-4 w-4" />
                      Remove Win
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleRemoveLoss}
                  disabled={isPending || !selectedDay}
                  variant="outline"
                  size="sm"
                  data-ocid="leaderboard.loss.secondary_button"
                >
                  {isRemovingLoss ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Minus className="h-4 w-4" />
                      Remove Loss
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Season countdown */}
      <div className="flex items-center gap-2 mb-4 px-1 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>
          <span className="font-semibold text-foreground">
            {currentYear} Season
          </span>
          {" — "}
          <span className="text-primary font-medium">
            {daysRemaining} days remaining
          </span>
        </span>
      </div>

      {/* Leaderboard tabs */}
      <Tabs defaultValue="current-season">
        <TabsList className="w-full mb-4">
          <TabsTrigger
            value="current-season"
            className="flex-1 text-xs"
            data-ocid="leaderboard.current_season.tab"
          >
            Current Season
          </TabsTrigger>
          <TabsTrigger
            value="all-time"
            className="flex-1 text-xs"
            data-ocid="leaderboard.all_time.tab"
          >
            All Time
          </TabsTrigger>
          <TabsTrigger
            value="past-seasons"
            className="flex-1 text-xs"
            data-ocid="leaderboard.past_seasons.tab"
          >
            Past Seasons
          </TabsTrigger>
        </TabsList>

        {/* ── Current Season ── */}
        <TabsContent value="current-season">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {currentYear} Season Rankings
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap a player to view their profile
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardTable
                leaderboard={currentSeasonLeaderboard}
                isLoading={isLoadingCurrentSeason}
                {...sharedTableProps}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── All Time ── */}
        <TabsContent value="all-time">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All-Time Rankings</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Streak column shows each player's best streak ever. Tap a player
                to view their profile.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardTable
                leaderboard={allTimeLeaderboard}
                isLoading={isLoadingAllTime}
                {...sharedTableProps}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Past Seasons ── */}
        <TabsContent value="past-seasons">
          {isLoadingPastSeasons ? (
            <Card>
              <CardContent className="p-6 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : pastSeasonSnapshots.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No past seasons yet.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Past seasons will appear here after the year ends.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastSeasonSnapshots.map((snapshot) => {
                const yearStr = snapshot.year.toString();
                const isOpen = expandedSeasons.has(yearStr);
                const champion = snapshot.leaderboard[0];
                const championEntry = champion
                  ? userDirectory?.get(champion[0].toString())
                  : null;
                const championName =
                  championEntry?.displayName ??
                  (champion
                    ? `${champion[0].toString().slice(0, 8)}...`
                    : "Unknown");

                return (
                  <Card key={yearStr}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleSeason(yearStr)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                🏆 {yearStr} Season
                              </CardTitle>
                              {champion && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Champion: {championName}
                                </p>
                              )}
                            </div>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-0 pb-2">
                          <div className="px-4 pb-2">
                            <p className="text-xs text-muted-foreground italic">
                              Locked snapshot — scores are final for this
                              season.
                            </p>
                          </div>
                          <LeaderboardTable
                            leaderboard={snapshot.leaderboard}
                            isLoading={false}
                            userDirectory={userDirectory}
                            isLoadingDirectory={isLoadingDirectory}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Player Profile Modal */}
      <PlayerProfileModal
        principal={selectedPlayerPrincipal}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        matchHistory={selectedPlayerMatchHistory}
      />
    </Page>
  );
}
