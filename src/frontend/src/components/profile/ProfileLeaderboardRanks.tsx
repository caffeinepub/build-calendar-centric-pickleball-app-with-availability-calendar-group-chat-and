import { useGetLeaderboard } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Skeleton } from '../ui/skeleton';

export default function ProfileLeaderboardRanks() {
  const { identity } = useInternetIdentity();
  const { data: weeklyLeaderboard = [], isLoading: isLoadingWeekly } = useGetLeaderboard('weekly');
  const { data: monthlyLeaderboard = [], isLoading: isLoadingMonthly } = useGetLeaderboard('monthly');
  const { data: allTimeLeaderboard = [], isLoading: isLoadingAll } = useGetLeaderboard('all');

  const callerPrincipal = identity?.getPrincipal().toString();

  // Find the caller's rank in each leaderboard (1-based)
  const weeklyRank = callerPrincipal
    ? weeklyLeaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal) + 1
    : 0;
  const monthlyRank = callerPrincipal
    ? monthlyLeaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal) + 1
    : 0;
  const allTimeRank = callerPrincipal
    ? allTimeLeaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal) + 1
    : 0;

  const isLoading = isLoadingWeekly || isLoadingMonthly || isLoadingAll;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Weekly Rank</div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Monthly Rank</div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">All-Time Rank</div>
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Weekly Rank</div>
        <div className="text-2xl font-bold">
          {weeklyRank > 0 ? `#${weeklyRank}` : '—'}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Monthly Rank</div>
        <div className="text-2xl font-bold">
          {monthlyRank > 0 ? `#${monthlyRank}` : '—'}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">All-Time Rank</div>
        <div className="text-2xl font-bold">
          {allTimeRank > 0 ? `#${allTimeRank}` : '—'}
        </div>
      </div>
    </div>
  );
}
