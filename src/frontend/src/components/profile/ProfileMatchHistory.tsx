import { Calendar } from 'lucide-react';
import { useGetCallerMatchHistory } from '../../hooks/useQueries';
import { formatDayId } from '../../lib/date';
import { Skeleton } from '../ui/skeleton';

export default function ProfileMatchHistory() {
  const { data: matchHistory = [], isLoading, error } = useGetCallerMatchHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load match history. Please try again later.
      </div>
    );
  }

  if (matchHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No match history yet. Add availability on the Calendar page and record your wins and losses on the Leaderboard page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matchHistory.map((entry) => {
        const wins = Number(entry.wins);
        const losses = Number(entry.losses);
        const totalGames = wins + losses;

        return (
          <div
            key={entry.day.toString()}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDayId(entry.day)}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Wins:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{wins}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Losses:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{losses}</span>
              </div>
              {totalGames === 0 && (
                <span className="text-xs text-muted-foreground italic">No games recorded</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
