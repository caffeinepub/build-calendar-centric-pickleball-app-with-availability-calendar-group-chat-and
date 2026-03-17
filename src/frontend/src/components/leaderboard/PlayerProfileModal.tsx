import type { Principal } from "@dfinity/principal";
import {
  Award,
  BarChart2,
  Flame,
  LineChart,
  Star,
  Star as StarIcon,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  useGetAllBadgeDefinitions,
  useGetPublicRankHistory,
  useGetUserAllTimeStats,
  useGetUserBadges,
  useGetUserDaysWithLogs,
  useGetUserStats,
} from "../../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../../hooks/useUserDirectory";
import ProfileRankHistoryChart from "../profile/ProfileRankHistoryChart";
import ProfileWinLossChart from "../profile/ProfileWinLossChart";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import AvatarName from "../user/AvatarName";

interface PlayerProfileModalProps {
  principal: Principal | null;
  open: boolean;
  onClose: () => void;
}

export default function PlayerProfileModal({
  principal,
  open,
  onClose,
}: PlayerProfileModalProps) {
  // All hooks must be called unconditionally at the top level
  const [chartTab, setChartTab] = useState<"winloss" | "rankhistory">(
    "winloss",
  );

  const principals = principal ? [principal] : [];
  const { data: userDirectory } = useUserDirectoryWithAvatars(principals);

  // Current season stats
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats(principal);
  // All-time stats — authoritative source for best streak ever
  const { data: allTimeStats, isLoading: isLoadingAllTime } =
    useGetUserAllTimeStats(principal);
  // Selected player's daily logs (for Win/Loss chart)
  const { data: playerDaysWithLogs = [], isLoading: isLoadingLogs } =
    useGetUserDaysWithLogs(principal);
  // Selected player's rank history (for Rank History chart)
  const { data: playerRankHistory = [], isLoading: isLoadingRankHistory } =
    useGetPublicRankHistory(principal);
  // Badges
  const { data: earnedBadgeIds = [], isLoading: isLoadingBadges } =
    useGetUserBadges(principal);
  const { data: allDefinitions = [], isLoading: isLoadingDefs } =
    useGetAllBadgeDefinitions();

  const entry = principal
    ? userDirectory?.get(principal.toString())
    : undefined;
  const displayName =
    entry?.displayName ??
    (principal ? `${principal.toString().slice(0, 8)}...` : "Player");
  const avatarUrl = entry?.avatarUrl;

  const currentStreak = Number(stats?.streak ?? 0n);
  const bestStreak =
    allTimeStats != null
      ? Number(allTimeStats.bestStreakEver)
      : Number(stats?.bestStreak ?? 0n);

  const earnedSet = new Set(earnedBadgeIds);
  const earnedDefinitions = allDefinitions.filter((d) => earnedSet.has(d.id));

  const isLoadingStats_ = isLoadingStats || isLoadingAllTime;
  const isLoadingCharts = isLoadingLogs || isLoadingRankHistory;
  const isLoadingBadges_ = isLoadingBadges || isLoadingDefs;

  const hasChartData =
    playerDaysWithLogs.length > 0 || playerRankHistory.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {principal && (
              <AvatarName
                principal={principal}
                displayName={displayName}
                avatarUrl={avatarUrl}
                size="md"
              />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Stats summary */}
          {isLoadingStats_ ? (
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-600">
                  {Number(stats.wins)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Wins</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-500">
                  {Number(stats.losses)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Losses</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  {Number(stats.wins) + Number(stats.losses) > 0
                    ? `${Math.round((Number(stats.wins) / (Number(stats.wins) + Number(stats.losses))) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Win %</p>
              </div>
            </div>
          ) : null}

          {/* Streaks */}
          {isLoadingStats_ ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500 flex-shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Current Streak
                  </p>
                  <p className="text-xl font-bold leading-tight">
                    {currentStreak > 0 ? `+${currentStreak}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentStreak > 0 ? "win streak" : "no active streak"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500 flex-shrink-0">
                  <Star className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Best Streak
                  </p>
                  <p className="text-xl font-bold leading-tight">
                    {bestStreak > 0 ? `+${bestStreak}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    all-time record
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Charts with toggle */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Performance</h4>
            {/* Chart tab toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-3">
              <button
                type="button"
                onClick={() => setChartTab("winloss")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  chartTab === "winloss"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Win/Loss
              </button>
              <button
                type="button"
                onClick={() => setChartTab("rankhistory")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  chartTab === "rankhistory"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LineChart className="h-3.5 w-3.5" />
                Rank History
              </button>
            </div>

            {isLoadingCharts ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : !hasChartData ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No performance data available yet
              </div>
            ) : chartTab === "winloss" ? (
              <ProfileWinLossChart
                data={playerDaysWithLogs}
                externalRange="all"
              />
            ) : (
              <ProfileRankHistoryChart data={playerRankHistory} range="all" />
            )}
          </div>

          {/* Earned Badges */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Earned Badges ({earnedDefinitions.length})
            </h4>
            {isLoadingBadges_ ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : earnedDefinitions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Award className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
                No badges earned yet
              </div>
            ) : (
              <div className="space-y-2">
                {earnedDefinitions.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/40"
                  >
                    <StarIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                    <div>
                      <p className="text-xs font-semibold">{badge.name}</p>
                      {badge.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {badge.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
