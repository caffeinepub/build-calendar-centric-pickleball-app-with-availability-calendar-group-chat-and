import { useMemo } from 'react';
import { Flame, Star, Trophy, X } from 'lucide-react';
import type { Principal } from '@dfinity/principal';
import type { DayWithLog } from '../../backend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useGetUserStats, useGetUserBadges, useGetAllBadgeDefinitions } from '../../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../../hooks/useUserDirectory';
import ProfileWinLossChart from '../profile/ProfileWinLossChart';
import AvatarName from '../user/AvatarName';
import { Award, Star as StarIcon } from 'lucide-react';

interface PlayerProfileModalProps {
  principal: Principal | null;
  open: boolean;
  onClose: () => void;
  /** Pre-fetched match history for this player (from leaderboard data) */
  matchHistory?: DayWithLog[];
}

function computeBestStreak(history: DayWithLog[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );
  let best = 0;
  let current = 0;
  for (const entry of sorted) {
    for (let i = 0; i < Number(entry.wins); i++) {
      current += 1;
      if (current > best) best = current;
    }
    for (let i = 0; i < Number(entry.losses); i++) {
      current = 0;
    }
  }
  return best;
}

function computeCurrentStreak(history: DayWithLog[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );
  const results: boolean[] = [];
  for (const entry of sorted) {
    for (let i = 0; i < Number(entry.wins); i++) results.push(true);
    for (let i = 0; i < Number(entry.losses); i++) results.push(false);
  }
  if (results.length === 0) return 0;
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) streak += 1;
    else break;
  }
  return streak;
}

export default function PlayerProfileModal({ principal, open, onClose, matchHistory = [] }: PlayerProfileModalProps) {
  const principals = useMemo(() => (principal ? [principal] : []), [principal]);
  const { data: userDirectory } = useUserDirectoryWithAvatars(principals);
  const { data: stats, isLoading: isLoadingStats } = useGetUserStats(principal);
  const { data: earnedBadgeIds = [], isLoading: isLoadingBadges } = useGetUserBadges(principal);
  const { data: allDefinitions = [], isLoading: isLoadingDefs } = useGetAllBadgeDefinitions();

  const entry = principal ? userDirectory?.get(principal.toString()) : undefined;
  const displayName = entry?.displayName ?? (principal ? principal.toString().slice(0, 8) + '...' : 'Player');
  const avatarUrl = entry?.avatarUrl;

  const currentStreak = useMemo(() => computeCurrentStreak(matchHistory), [matchHistory]);
  const bestStreak = useMemo(() => computeBestStreak(matchHistory), [matchHistory]);

  const earnedSet = new Set(earnedBadgeIds);
  const earnedDefinitions = allDefinitions.filter(d => earnedSet.has(d.id));

  const isLoading = isLoadingStats || isLoadingBadges || isLoadingDefs;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
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

        {isLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{Number(stats.wins)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Wins</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-500">{Number(stats.losses)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Losses</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-2xl font-bold">
                    {Number(stats.wins) + Number(stats.losses) > 0
                      ? `${Math.round((Number(stats.wins) / (Number(stats.wins) + Number(stats.losses))) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Win %</p>
                </div>
              </div>
            )}

            {/* Streaks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500 flex-shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Current Streak</p>
                  <p className="text-xl font-bold leading-tight">
                    {currentStreak > 0 ? `+${currentStreak}` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentStreak > 0 ? 'win streak' : 'no active streak'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500 flex-shrink-0">
                  <Star className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Best Streak</p>
                  <p className="text-xl font-bold leading-tight">
                    {bestStreak > 0 ? `+${bestStreak}` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">all-time record</p>
                </div>
              </div>
            </div>

            {/* Win/Loss Chart */}
            {matchHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Performance Chart</h4>
                <ProfileWinLossChart data={matchHistory} />
              </div>
            )}

            {/* Earned Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Earned Badges ({earnedDefinitions.length})
              </h4>
              {earnedDefinitions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Award className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
                  No badges earned yet
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {earnedDefinitions.map((badge) => (
                    <Badge key={badge.id} variant="secondary" className="text-xs py-1 px-2.5">
                      <StarIcon className="h-3 w-3 mr-1 text-yellow-500" />
                      {badge.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
