import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useGetCallerMatchHistory } from "../../hooks/useQueries";
import { formatDayId, getDayId } from "../../lib/date";
import { ErrorState } from "../common/ErrorState";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

const PAGE_SIZE = 10;

export default function ProfileMatchHistory() {
  const {
    data: matchHistory,
    isLoading,
    error,
    refetch,
  } = useGetCallerMatchHistory();
  const [page, setPage] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {["s1", "s2", "s3", "s4", "s5"].map((k) => (
          <div key={k} className="flex items-center justify-between py-2">
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

  // Filter: only past dates with at least one recorded result
  const today = getDayId(new Date());
  const filtered = [...(matchHistory || [])]
    .filter((entry) => {
      // Exclude future dates (strictly after today)
      if (entry.day > today) return false;
      // Exclude entries with no results
      if (entry.wins === 0n && entry.losses === 0n) return false;
      return true;
    })
    .sort((a, b) => (a.day > b.day ? -1 : a.day < b.day ? 1 : 0));

  if (filtered.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No completed match history yet. Record wins and losses on the
        Leaderboard page.
      </p>
    );
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="space-y-0">
        {pageItems.map((entry) => {
          return (
            <div
              key={entry.day.toString()}
              className="flex items-center justify-between py-2.5 border-b last:border-0"
            >
              <span className="font-medium text-sm">
                {formatDayId(entry.day)}
              </span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  {entry.wins.toString()}{" "}
                  {Number(entry.wins) === 1 ? "win" : "wins"}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {entry.losses.toString()}{" "}
                  {Number(entry.losses) === 1 ? "loss" : "losses"}
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
            onClick={() => setPage((p) => Math.max(0, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {filtered.length} total {filtered.length === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
}
