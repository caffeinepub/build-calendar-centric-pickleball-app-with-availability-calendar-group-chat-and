import type { Principal } from "@dfinity/principal";
import { Flame, Star, Trophy } from "lucide-react";
import { Award, Star as StarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DayWithLog, IndividualMatchResult } from "../../backend";
import { Variant_win_loss } from "../../backend";
import {
  useGetAllBadgeDefinitions,
  useGetIndividualResults,
  useGetRankHistory,
  useGetUserAllTimeStats,
  useGetUserBadges,
  useGetUserStats,
} from "../../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../../hooks/useUserDirectory";
import ProfileRankHistoryChart from "../profile/ProfileRankHistoryChart";
import ProfileWinLossChart, {
  type TimeRange,
  RANGE_LABELS,
} from "../profile/ProfileWinLossChart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import AvatarName from "../user/AvatarName";

interface PlayerProfileModalProps {
  principal: Principal | null;
  open: boolean;
  onClose: () => void;
  matchHistory?: DayWithLog[];
}

function toDayWithLogs(results: IndividualMatchResult[]): DayWithLog[] {
  const map = new Map<string, { wins: bigint; losses: bigint; day: bigint }>();
  for (const r of results) {
    const key = r.dayInt.toString();
    if (!map.has(key)) map.set(key, { wins: 0n, losses: 0n, day: r.dayInt });
    const entry = map.get(key)!;
    if (r.result === Variant_win_loss.win) {
      entry.wins += 1n;
    } else {
      entry.losses += 1n;
    }
  }
  return Array.from(map.values()).map((e) => ({
    day: e.day,
    wins: e.wins,
    losses: e.losses,
  }));
}

export default function PlayerProfileModal({
  principal,
  open,
  onClose,
}: PlayerProfileModalProps) {
  const principals = useMemo(() => (principal ? [principal] : []), [principal]);
  const { data: userDirectory } = useUserDirectoryWithAvatars(principals);
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats(principal);
  const { data: allTimeStats, isLoading: isLoadingAllTime } =
    useGetUserAllTimeStats(principal);
  const { data: earnedBadgeIds = [], isLoading: isLoadingBadges } =
    useGetUserBadges(principal);
  const { data: allDefinitions = [], isLoading: isLoadingDefs } =
    useGetAllBadgeDefinitions();
  const { data: individualResults = [], isLoading: isLoadingResults } =
    useGetIndividualResults(principal);
  const { data: rankHistoryData = [], isLoading: isLoadingRankHistory } =
    useGetRankHistory(principal);

  const [chartView, setChartView] = useState<"winloss" | "rank">("winloss");
  const [chartRange, setChartRange] = useState<TimeRange>("all");

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

  const matchHistory = useMemo(
    () => toDayWithLogs(individualResults),
    [individualResults],
  );

  const earnedSet = new Set(earnedBadgeIds);
  const earnedDefinitions = allDefinitions.filter((d) => earnedSet.has(d.id));
  const isLoadingBadgeSection = isLoadingBadges || isLoadingDefs;

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
          {/* Stats summary — shows as soon as stats load */}
          {isLoadingStats ? (
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

          {/* Streaks — shows when stats + allTime resolve */}
          {isLoadingStats || isLoadingAllTime ? (
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

          {/* Performance Charts — shows when results load */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Performance</h4>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartView("winloss")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartView === "winloss"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Win/Loss
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("rank")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartView === "rank"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rank History
                </button>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartRange === r
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            {chartView === "winloss" &&
              (isLoadingResults ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : (
                <ProfileWinLossChart
                  data={matchHistory}
                  externalRange={chartRange}
                />
              ))}
            {chartView === "rank" &&
              (isLoadingRankHistory ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : (
                <ProfileRankHistoryChart
                  data={rankHistoryData}
                  range={chartRange}
                />
              ))}
          </div>

          {/* Earned Badges — shows when badge data loads */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Earned Badges
              {!isLoadingBadgeSection && ` (${earnedDefinitions.length})`}
            </h4>
            {isLoadingBadgeSection ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
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
