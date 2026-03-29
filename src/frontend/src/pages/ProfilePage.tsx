import {
  Award,
  BarChart2,
  Flame,
  LineChart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";
import type { DayWithLog } from "../backend";
import { Page, PageHeader } from "../components/layout/PageLayout";
import ProfileBadges from "../components/profile/ProfileBadges";
import ProfileCard from "../components/profile/ProfileCard";
import ProfileLeaderboardRanks from "../components/profile/ProfileLeaderboardRanks";
import ProfileMatchHistory from "../components/profile/ProfileMatchHistory";
import ProfileRankHistoryChart from "../components/profile/ProfileRankHistoryChart";
import ProfileWinLossChart, {
  type TimeRange,
  RANGE_LABELS,
} from "../components/profile/ProfileWinLossChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerAllTimeColdStreak,
  useGetCallerMatchHistory,
  useGetCallerStats,
  useGetMyRankHistory,
} from "../hooks/useQueries";

function StreakStats() {
  const { data: stats, isLoading: statsLoading } = useGetCallerStats();
  const { data: allTimeColdStreakRaw } = useGetCallerAllTimeColdStreak();

  if (statsLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    );
  }

  const currentStreak = Number(stats?.streak ?? 0n);
  const bestStreak = Number(stats?.bestStreak ?? 0n);
  const allTimeColdStreak = Number(allTimeColdStreakRaw ?? 0n);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <div
          className={`p-2 rounded-md flex-shrink-0 ${
            currentStreak > 0
              ? "bg-orange-500/10 text-orange-500"
              : currentStreak < 0
                ? "bg-blue-500/10 text-blue-500"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {currentStreak < 0 ? (
            <span className="text-sm">❄️</span>
          ) : (
            <Flame className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            Current Streak
          </p>
          <p className="text-2xl font-bold leading-tight">
            {currentStreak > 0
              ? `+${currentStreak}`
              : currentStreak < 0
                ? Math.abs(currentStreak)
                : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentStreak > 0
              ? "win streak"
              : currentStreak < 0
                ? "losing streak"
                : "no active streak"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-500 flex-shrink-0">
          <Star className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            Best Streak
          </p>
          <p className="text-2xl font-bold leading-tight">
            {bestStreak > 0 ? `+${bestStreak}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">all-time record</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 flex-shrink-0 text-sm">
          ❄️
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            Cold Streak
          </p>
          <p className="text-2xl font-bold leading-tight">
            {allTimeColdStreak > 0 ? allTimeColdStreak : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            all-time longest losing
          </p>
        </div>
      </div>
    </div>
  );
}

type ChartView = "winloss" | "rankhistory";

function PerformanceCharts({ matchHistory }: { matchHistory: DayWithLog[] }) {
  const [chartView, setChartView] = useState<ChartView>("winloss");
  const [range, setRange] = useState<TimeRange>("month");
  const { data: rankHistory = [] } = useGetMyRankHistory();

  return (
    <div className="space-y-4">
      {/* Chart type toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          data-ocid="profile.winloss.toggle"
          onClick={() => setChartView("winloss")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            chartView === "winloss"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Win / Loss
        </button>
        <button
          type="button"
          data-ocid="profile.rankhistory.toggle"
          onClick={() => setChartView("rankhistory")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            chartView === "rankhistory"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LineChart className="h-3.5 w-3.5" />
          Rank History
        </button>
      </div>

      {/* Shared time range selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
          <button
            type="button"
            key={r}
            data-ocid={`profile.range.${r}.toggle`}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              range === r
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Chart content */}
      {chartView === "winloss" ? (
        <ProfileWinLossChart data={matchHistory} externalRange={range} />
      ) : (
        <ProfileRankHistoryChart data={rankHistory} range={range} />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: matchHistory = [] } = useGetCallerMatchHistory();
  const { data: callerStats = null } = useGetCallerStats();
  const callerPrincipal = identity?.getPrincipal() ?? null;

  return (
    <Page maxWidth="4xl">
      <PageHeader
        icon={<User className="h-8 w-8 text-primary" />}
        title="Profile"
      />

      <ProfileCard />

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard Ranking</CardTitle>
          <CardDescription>Your current all-time ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileLeaderboardRanks />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streaks
          </CardTitle>
          <CardDescription>
            Current and all-time best win streaks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StreakStats />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance
          </CardTitle>
          <CardDescription>
            Win/Loss history and rank changes over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceCharts matchHistory={matchHistory} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges & Achievements
          </CardTitle>
          <CardDescription>
            All available badges, earned and in progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileBadges
            userPrincipal={callerPrincipal}
            matchHistory={matchHistory}
            userStats={callerStats}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
          <CardDescription>
            Your complete win/loss history with pagination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileMatchHistory />
        </CardContent>
      </Card>
    </Page>
  );
}
