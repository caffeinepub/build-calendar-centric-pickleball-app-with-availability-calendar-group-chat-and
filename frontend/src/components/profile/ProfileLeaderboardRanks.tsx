import { useGetLeaderboard } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Skeleton } from '../ui/skeleton';

export default function ProfileLeaderboardRanks() {
  const { identity } = useInternetIdentity();
  const { data: leaderboard = [], isLoading } = useGetLeaderboard();

  const callerPrincipal = identity?.getPrincipal().toString();

  const rank = callerPrincipal
    ? leaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal) + 1
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">All-Time Rank</div>
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">All-Time Rank</div>
      <div className="text-2xl font-bold">
        {rank > 0 ? `#${rank}` : '—'}
      </div>
    </div>
  );
}
