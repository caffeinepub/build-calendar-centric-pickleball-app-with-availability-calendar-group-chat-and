import { useState, useEffect, useRef } from 'react';
import { Trophy, Plus, Minus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  useGetLeaderboard, 
  useRecordDailyWin, 
  useRecordDailyLoss, 
  useRemoveDailyWin,
  useRemoveDailyLoss,
  useGetCallerAvailableDays,
  useGetCallerMatchHistory
} from '../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../hooks/useUserDirectory';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AvatarName from '../components/user/AvatarName';
import { formatDayId } from '../lib/date';
import { toast } from 'sonner';
import { Page, PageHeader } from '../components/layout/PageLayout';
import { InlineLoading } from '../components/common/LoadingState';
import PlayerProfileModal from '../components/leaderboard/PlayerProfileModal';
import type { DayWithLog } from '../backend';
import type { Principal } from '@dfinity/principal';

/**
 * Computes the current win streak from a user's match history.
 */
function computeCurrentStreak(history: DayWithLog[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );
  const results: boolean[] = [];
  for (const entry of sorted) {
    const wins = Number(entry.wins);
    const losses = Number(entry.losses);
    for (let i = 0; i < wins; i++) results.push(true);
    for (let i = 0; i < losses; i++) results.push(false);
  }
  if (results.length === 0) return 0;
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === true) streak += 1;
    else break;
  }
  return streak;
}

export default function LeaderboardPage() {
  const { data: leaderboard = [], isLoading } = useGetLeaderboard();
  const principals = leaderboard.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { identity } = useInternetIdentity();
  const { isLoading: isLoadingDays, isFetched: isDaysFetched } = useGetCallerAvailableDays();
  const { data: matchHistory = [] } = useGetCallerMatchHistory();
  const { mutate: recordWin, isPending: isRecordingWin } = useRecordDailyWin();
  const { mutate: recordLoss, isPending: isRecordingLoss } = useRecordDailyLoss();
  const { mutate: removeWin, isPending: isRemovingWin } = useRemoveDailyWin();
  const { mutate: removeLoss, isPending: isRemovingLoss } = useRemoveDailyLoss();
  
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPlayerPrincipal, setSelectedPlayerPrincipal] = useState<Principal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const callerPrincipal = identity?.getPrincipal().toString();

  // Track rank changes for toast notifications
  const previousRankRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Sort match history in descending order (newest first) for the dropdown
  const sortedMatchHistory = [...matchHistory].sort((a, b) =>
    a.day > b.day ? -1 : a.day < b.day ? 1 : 0
  );

  // Detect rank improvements
  useEffect(() => {
    if (!callerPrincipal || leaderboard.length === 0) return;

    const currentRank = leaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal);
    
    if (currentRank === -1) return;

    const currentRankNumber = currentRank + 1;

    if (isInitialLoadRef.current) {
      previousRankRef.current = currentRankNumber;
      isInitialLoadRef.current = false;
    } else if (previousRankRef.current !== null && currentRankNumber < previousRankRef.current) {
      toast.success(`You moved up to #${currentRankNumber}!`);
      previousRankRef.current = currentRankNumber;
    } else if (previousRankRef.current !== null && currentRankNumber !== previousRankRef.current) {
      previousRankRef.current = currentRankNumber;
    }
  }, [leaderboard, callerPrincipal]);

  // Auto-select the most recent day when match history loads
  useEffect(() => {
    if (isDaysFetched && sortedMatchHistory.length > 0 && !selectedDay) {
      setSelectedDay(sortedMatchHistory[0].day.toString());
    }
  }, [isDaysFetched, sortedMatchHistory.length]);

  const isPending = isRecordingWin || isRecordingLoss || isRemovingWin || isRemovingLoss;

  const handleRecordWin = () => {
    if (!selectedDay) {
      toast.error('Please select a date first');
      return;
    }
    recordWin(BigInt(selectedDay), {
      onSuccess: () => toast.success('Win recorded successfully!'),
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to record win. Make sure you are marked available for this date.');
      },
    });
  };

  const handleRecordLoss = () => {
    if (!selectedDay) {
      toast.error('Please select a date first');
      return;
    }
    recordLoss(BigInt(selectedDay), {
      onSuccess: () => toast.success('Loss recorded successfully!'),
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to record loss. Make sure you are marked available for this date.');
      },
    });
  };

  const handleRemoveWin = () => {
    if (!selectedDay) {
      toast.error('Please select a date first');
      return;
    }
    const dayLog = matchHistory.find(entry => entry.day.toString() === selectedDay);
    if (!dayLog || dayLog.wins === 0n) {
      toast.error('No wins to remove for this date');
      return;
    }
    removeWin(BigInt(selectedDay), {
      onSuccess: () => toast.success('Win removed successfully'),
      onError: (error: any) => toast.error(error?.message || 'Failed to remove win'),
    });
  };

  const handleRemoveLoss = () => {
    if (!selectedDay) {
      toast.error('Please select a date first');
      return;
    }
    const dayLog = matchHistory.find(entry => entry.day.toString() === selectedDay);
    if (!dayLog || dayLog.losses === 0n) {
      toast.error('No losses to remove for this date');
      return;
    }
    removeLoss(BigInt(selectedDay), {
      onSuccess: () => toast.success('Loss removed successfully'),
      onError: (error: any) => toast.error(error?.message || 'Failed to remove loss'),
    });
  };

  const handlePlayerClick = (principal: Principal) => {
    setSelectedPlayerPrincipal(principal);
    setModalOpen(true);
  };

  const selectedDayLog = selectedDay
    ? matchHistory.find(entry => entry.day.toString() === selectedDay)
    : null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">🥇 #1</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white hover:bg-gray-400">🥈 #2</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white hover:bg-amber-600">🥉 #3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getWinRate = (wins: bigint, losses: bigint): string => {
    const total = Number(wins) + Number(losses);
    if (total === 0) return '—';
    return `${Math.round((Number(wins) / total) * 100)}%`;
  };

  const currentStreak = computeCurrentStreak(matchHistory);

  // Find match history for the selected player (only available for current user)
  const selectedPlayerMatchHistory: DayWithLog[] = selectedPlayerPrincipal?.toString() === callerPrincipal
    ? matchHistory
    : [];

  return (
    <Page>
      <PageHeader
        icon={<Trophy className="h-5 w-5" />}
        title="Leaderboard"
      />

      {/* Record wins/losses section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Record Match Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDays ? (
            <InlineLoading message="Loading your available dates..." />
          ) : sortedMatchHistory.length === 0 ? (
            <Alert>
              <AlertDescription>
                You need to add availability dates before recording match results. Go to the Calendar tab to add your availability.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date</label>
                <Select value={selectedDay ?? ''} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedMatchHistory.map(entry => (
                      <SelectItem key={entry.day.toString()} value={entry.day.toString()}>
                        <span className="flex items-center gap-2">
                          {formatDayId(entry.day)}
                          {(entry.wins > 0n || entry.losses > 0n) && (
                            <span className="text-xs text-muted-foreground">
                              ({Number(entry.wins)}W / {Number(entry.losses)}L)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDayLog && (selectedDayLog.wins > 0n || selectedDayLog.losses > 0n) && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  Current for this date: <span className="text-green-600 font-medium">{Number(selectedDayLog.wins)} wins</span> / <span className="text-red-500 font-medium">{Number(selectedDayLog.losses)} losses</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRecordWin}
                  disabled={isPending || !selectedDay}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isRecordingWin ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Win
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleRecordLoss}
                  disabled={isPending || !selectedDay}
                  variant="destructive"
                >
                  {isRecordingLoss ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Loss
                    </span>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRemoveWin}
                  disabled={isPending || !selectedDay}
                  variant="outline"
                  size="sm"
                >
                  {isRemovingWin ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Minus className="h-4 w-4" />
                      Remove Win
                    </span>
                  )}
                </Button>
                <Button
                  onClick={handleRemoveLoss}
                  disabled={isPending || !selectedDay}
                  variant="outline"
                  size="sm"
                >
                  {isRemovingLoss ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Minus className="h-4 w-4" />
                      Remove Loss
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rankings</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Tap a player to view their profile</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || isLoadingDirectory ? (
            <div className="p-4">
              <InlineLoading message="Loading leaderboard..." />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No players on the leaderboard yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">GP</TableHead>
                  <TableHead className="text-right">Win%</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map(([principal, stats], index) => {
                  const rank = index + 1;
                  const isCurrentUser = principal.toString() === callerPrincipal;
                  const entry = userDirectory?.get(principal.toString());
                  const displayStreak = isCurrentUser ? currentStreak : Number(stats.streak);
                  const gamesPlayed = Number(stats.wins) + Number(stats.losses);

                  return (
                    <TableRow
                      key={principal.toString()}
                      className={`cursor-pointer transition-colors hover:bg-muted/60 ${isCurrentUser ? 'bg-primary/5 font-medium' : ''}`}
                      onClick={() => handlePlayerClick(principal)}
                    >
                      <TableCell>{getRankBadge(rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AvatarName
                            principal={principal}
                            displayName={entry?.displayName ?? principal.toString().slice(0, 8) + '...'}
                            avatarUrl={entry?.avatarUrl}
                            size="sm"
                          />
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {Number(stats.wins)}
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        {Number(stats.losses)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {gamesPlayed}
                      </TableCell>
                      <TableCell className="text-right">
                        {getWinRate(stats.wins, stats.losses)}
                      </TableCell>
                      <TableCell className="text-right">
                        {displayStreak > 0 ? (
                          <span className="text-orange-500 font-medium">🔥 {displayStreak}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Player Profile Modal */}
      <PlayerProfileModal
        principal={selectedPlayerPrincipal}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        matchHistory={selectedPlayerMatchHistory}
      />
    </Page>
  );
}
