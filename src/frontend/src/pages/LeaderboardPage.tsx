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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DayWithLog } from "../backend";
import { NotificationCategory } from "../backend";
import type { T as UserStats } from "../backend";
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
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllTimeLeaderboard,
  useGetCallerAvailableDays,
  useGetCallerMatchHistory,
  useGetCurrentSeasonLeaderboard,
  useGetLeaderboard,
  useGetMyNotifications,
  useGetPastSeasonSnapshots,
  useMarkNotificationRead,
  useRecordDailyLoss,
  useRecordDailyWin,
  useRemoveDailyLoss,
  useRemoveDailyWin,
} from "../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../hooks/useUserDirectory";
import { formatDayId } from "../lib/date";

/**
 * Computes the current win streak from a user's match history.
 */
function computeCurrentStreak(history: DayWithLog[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  const results: boolean[] = [];
  for (const entry of sorted) {
    const wins = Number(entry.wins);
    const losses = Number(entry.losses);
    for (let i = 0; i < wins; i++) results.push(true);
    for (let i = 0; i < losses; i++) results.push(false);
  }
  if (results.length === 0) return 0;
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === true) streak += 1;
    else break;
  }
  return streak;
}

/** Returns days remaining until Dec 31 of current year */
function getDaysRemainingInSeason(): number {
  const today = new Date();
  const yearEnd = new Date(today.getFullYear(), 11, 31); // Dec 31
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
  currentStreak?: number;
  rankChanges?: Map<string, "up" | "down" | "same">;
  onPlayerClick?: (principal: Principal) => void;
  userDirectory?: Map<string, { displayName: string; avatarUrl?: string }>;
  isLoadingDirectory?: boolean;
}

function LeaderboardTable({
  leaderboard,
  isLoading,
  callerPrincipal,
  currentStreak = 0,
  rankChanges,
  onPlayerClick,
  userDirectory,
  isLoadingDirectory,
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
          const displayStreak = isCurrentUser
            ? currentStreak
            : Number(stats.streak);
          const gamesPlayed = Number(stats.wins) + Number(stats.losses);

          return (
            <TableRow
              key={principal.toString()}
              className={`cursor-pointer transition-colors hover:bg-muted/60 ${isCurrentUser ? "bg-primary/5 font-medium" : ""}`}
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
                <div className="flex items-center gap-1">
                  <AvatarName
                    principal={principal}
                    displayName={
                      entry?.displayName ??
                      `${principal.toString().slice(0, 8)}...`
                    }
                    avatarUrl={entry?.avatarUrl}
                    size="sm"
                  />
                  {isCurrentUser && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </div>
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
  const { data: leaderboard = [] } = useGetLeaderboard();
  const {
    data: currentSeasonLeaderboard = [],
    isLoading: isLoadingCurrentSeason,
  } = useGetCurrentSeasonLeaderboard();
  const { data: allTimeLeaderboardRaw = [], isLoading: isLoadingAllTime } =
    useGetAllTimeLeaderboard();
  const { data: pastSeasonSnapshots = [], isLoading: isLoadingPastSeasons } =
    useGetPastSeasonSnapshots();

  const principals = leaderboard.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } =
    useUserDirectoryWithAvatars(principals);

  const { identity } = useInternetIdentity();
  const { isLoading: isLoadingDays, isFetched: isDaysFetched } =
    useGetCallerAvailableDays();
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
  const [rankChanges, setRankChanges] = useState<
    Map<string, "up" | "down" | "same">
  >(new Map());

  // Past season expand state
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(
    new Set(),
  );

  const callerPrincipal = identity?.getPrincipal().toString();
  const currentYear = new Date().getFullYear();
  const daysRemaining = getDaysRemainingInSeason();

  // Notification-based rank change toasts
  const { data: notifications = [] } = useGetMyNotifications();
  const { mutate: markNotifRead } = useMarkNotificationRead();
  const shownNotifIdsRef = useRef<Set<string>>(new Set());

  // Map AllTimeStats to UserStats shape for the leaderboard table.
  // bestStreakEver is placed in both streak and bestStreak so the Streak column
  // shows the all-time best streak for every player.
  const allTimeLeaderboard: Array<[Principal, UserStats]> =
    allTimeLeaderboardRaw.map(([principal, ats]) => [
      principal,
      {
        wins: ats.wins,
        losses: ats.losses,
        totalGames: ats.totalGames,
        streak: ats.bestStreakEver,
        bestStreak: ats.bestStreakEver,
      } as UserStats,
    ]);

  // Sort match history in descending order (newest first) for the dropdown
  const sortedMatchHistory = [...matchHistory].sort((a, b) =>
    a.day > b.day ? -1 : a.day < b.day ? 1 : 0,
  );

  // Notification-based rank change toasts
  useEffect(() => {
    if (notifications.length === 0) return;
    const rankNotifs = notifications.filter(
      (n) => n.category === NotificationCategory.rankChange,
    );
    for (const notif of rankNotifs) {
      const idStr = notif.id.toString();
      if (shownNotifIdsRef.current.has(idStr)) continue;
      shownNotifIdsRef.current.add(idStr);
      if (
        notif.newRank !== undefined &&
        notif.oldRank !== undefined &&
        notif.newRank < notif.oldRank
      ) {
        toast.success(`Your rank improved to #${Number(notif.newRank)}!`);
      } else if (
        notif.newRank !== undefined &&
        notif.oldRank !== undefined &&
        notif.newRank > notif.oldRank
      ) {
        toast.error(`Your rank dropped to #${Number(notif.newRank)}.`);
      }
      if (!notif.read) {
        markNotifRead(notif.id);
      }
    }
  }, [notifications, markNotifRead]);

  // Compute rank change visual indicators from current leaderboard order
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const changes = new Map<string, "up" | "down" | "same">();

    // Build direction map from rankChange notifications for current user's neighbors
    const rankNotifMap = new Map<string, "up" | "down">();
    for (const notif of notifications) {
      if (notif.category !== NotificationCategory.rankChange) continue;
      if (notif.newRank !== undefined && notif.oldRank !== undefined) {
        if (notif.newRank < notif.oldRank) {
          rankNotifMap.set(callerPrincipal ?? "", "up");
        } else if (notif.newRank > notif.oldRank) {
          rankNotifMap.set(callerPrincipal ?? "", "down");
        }
      }
    }

    for (const [principal] of leaderboard) {
      const pStr = principal.toString();
      const dir = rankNotifMap.get(pStr);
      changes.set(pStr, dir ?? "same");
    }
    setRankChanges(changes);
  }, [leaderboard, notifications, callerPrincipal]);

  // Auto-select the most recent day when match history loads
  useEffect(() => {
    if (isDaysFetched && sortedMatchHistory.length > 0 && !selectedDay) {
      setSelectedDay(sortedMatchHistory[0].day.toString());
    }
  }, [isDaysFetched, sortedMatchHistory, selectedDay]);

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

  const currentStreak = computeCurrentStreak(matchHistory);

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

  // Table props shared between current-season and all-time tabs
  const sharedTableProps = {
    callerPrincipal,
    currentStreak,
    rankChanges,
    onPlayerClick: handlePlayerClick,
    userDirectory,
    isLoadingDirectory,
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
          ) : sortedMatchHistory.length === 0 ? (
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
                    {sortedMatchHistory.map((entry) => (
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
