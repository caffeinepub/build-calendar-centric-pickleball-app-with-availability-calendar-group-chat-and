import { User, Award, TrendingUp, Flame, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ProfileCard from '../components/profile/ProfileCard';
import ProfileLeaderboardRanks from '../components/profile/ProfileLeaderboardRanks';
import ProfileMatchHistory from '../components/profile/ProfileMatchHistory';
import ProfileWinLossChart from '../components/profile/ProfileWinLossChart';
import ProfileBadges from '../components/profile/ProfileBadges';
import { Page, PageHeader } from '../components/layout/PageLayout';
import { useGetCallerStats, useGetCallerMatchHistory } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Skeleton } from '../components/ui/skeleton';
import type { DayWithLog } from '../backend';

/**
 * Computes the longest consecutive winning streak from match history.
 * A "day" counts toward the streak if it has at least one win and zero losses.
 * Days with losses break the streak. Days with both wins and losses are treated
 * as mixed (streak-breaking) to be conservative.
 */
function computeBestStreak(history: DayWithLog[]): number {
  if (history.length === 0) return 0;

  // Sort chronologically (ascending by day id)
  const sorted = [...history].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );

  let best = 0;
  let current = 0;

  for (const entry of sorted) {
    const wins = Number(entry.wins);
    const losses = Number(entry.losses);

    if (wins > 0 && losses === 0) {
      // Pure win day — extend streak
      current += 1;
      if (current > best) best = current;
    } else if (losses > 0) {
      // Any loss resets the streak
      current = 0;
    }
    // Days with 0 wins and 0 losses (no games) are ignored — don't break or extend
  }

  return best;
}

function StreakStats() {
  const { data: stats, isLoading: statsLoading } = useGetCallerStats();
  const { data: matchHistory = [], isLoading: historyLoading } = useGetCallerMatchHistory();

  const isLoading = statsLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
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

  const currentStreak = stats ? Number(stats.streak) : 0;
  const bestStreak = computeBestStreak(matchHistory);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <div className="p-2 rounded-md bg-orange-500/10 text-orange-500 flex-shrink-0">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Current Streak</p>
          <p className="text-2xl font-bold leading-tight">
            {currentStreak > 0 ? `+${currentStreak}` : currentStreak < 0 ? currentStreak : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentStreak > 0 ? 'win streak' : currentStreak < 0 ? 'loss streak' : 'no streak'}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
        <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-500 flex-shrink-0">
          <Star className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">Best Streak</p>
          <p className="text-2xl font-bold leading-tight">
            {bestStreak > 0 ? `+${bestStreak}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">all-time record</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: matchHistory = [] } = useGetCallerMatchHistory();
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
          <CardDescription>Current and all-time best win streaks</CardDescription>
        </CardHeader>
        <CardContent>
          <StreakStats />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Win / Loss Chart
          </CardTitle>
          <CardDescription>Your performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileWinLossChart data={matchHistory} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges & Achievements
          </CardTitle>
          <CardDescription>Badges you've earned through your performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileBadges userPrincipal={callerPrincipal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
          <CardDescription>Your wins and losses for the last 5 availabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileMatchHistory />
        </CardContent>
      </Card>
    </Page>
  );
}
