import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDayId } from '../../lib/date';
import { useGetCallerMatchHistory } from '../../hooks/useQueries';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { ErrorState } from '../common/ErrorState';

const PAGE_SIZE = 10;

export default function ProfileMatchHistory() {
  const { data: matchHistory, isLoading, error, refetch } = useGetCallerMatchHistory();
  const [page, setPage] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
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

  // Sort newest first for display
  const sorted = [...matchHistory].sort((a, b) =>
    a.day > b.day ? -1 : a.day < b.day ? 1 : 0
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="space-y-0">
        {pageItems.map((entry) => {
          return (
            <div key={entry.day.toString()} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <span className="font-medium text-sm">{formatDayId(entry.day)}</span>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {sorted.length} total {sorted.length === 1 ? 'entry' : 'entries'}
      </p>
    </div>
  );
}
