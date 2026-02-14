import { formatDayId } from '../../lib/date';
import { useGetCallerMatchHistory } from '../../hooks/useQueries';
import { Skeleton } from '../ui/skeleton';
import { InlineLoading } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';

export default function ProfileMatchHistory() {
  const { data: matchHistory, isLoading, error, refetch } = useGetCallerMatchHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load match history. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (!matchHistory || matchHistory.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No match history yet. Record wins and losses on the Leaderboard page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {matchHistory.map((entry) => {
        const totalGames = Number(entry.wins) + Number(entry.losses);
        return (
          <div key={entry.day.toString()} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="font-medium">{formatDayId(entry.day)}</span>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400">
                {entry.wins.toString()} {Number(entry.wins) === 1 ? 'win' : 'wins'}
              </span>
              <span className="text-red-600 dark:text-red-400">
                {entry.losses.toString()} {Number(entry.losses) === 1 ? 'loss' : 'losses'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
