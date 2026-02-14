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

export default function LeaderboardPage() {
  const { data: leaderboard = [], isLoading } = useGetLeaderboard();
  const principals = leaderboard.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { identity } = useInternetIdentity();
  const { data: availableDays = [], isLoading: isLoadingDays } = useGetCallerAvailableDays();
  const { data: matchHistory = [] } = useGetCallerMatchHistory();
  const { mutate: recordWin, isPending: isRecordingWin } = useRecordDailyWin();
  const { mutate: recordLoss, isPending: isRecordingLoss } = useRecordDailyLoss();
  const { mutate: removeWin, isPending: isRemovingWin } = useRemoveDailyWin();
  const { mutate: removeLoss, isPending: isRemovingLoss } = useRemoveDailyLoss();
  
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString();

  // Track rank changes for toast notifications
  const previousRankRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Detect rank improvements
  useEffect(() => {
    if (!callerPrincipal || leaderboard.length === 0) return;

    const currentRank = leaderboard.findIndex(([principal]) => principal.toString() === callerPrincipal);
    
    if (currentRank === -1) return;

    const currentRankNumber = currentRank + 1; // Convert to 1-based rank

    if (isInitialLoadRef.current) {
      // First observation - just store the rank, don't toast
      previousRankRef.current = currentRankNumber;
      isInitialLoadRef.current = false;
    } else if (previousRankRef.current !== null && currentRankNumber < previousRankRef.current) {
      // Rank improved (smaller number is better)
      toast.success(`You moved up to #${currentRankNumber}!`);
      previousRankRef.current = currentRankNumber;
    } else if (previousRankRef.current !== null && currentRankNumber !== previousRankRef.current) {
      // Rank changed but didn't improve - just update the ref without toasting
      previousRankRef.current = currentRankNumber;
    }
  }, [leaderboard, callerPrincipal]);

  const isPending = isRecordingWin || isRecordingLoss || isRemovingWin || isRemovingLoss;

  const handleRecordWin = () => {
    if (!selectedDay) {
      toast.error('Please select a date first');
      return;
    }
    recordWin(BigInt(selectedDay), {
      onSuccess: () => {
        toast.success('Win recorded successfully!');
      },
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
      onSuccess: () => {
        toast.success('Loss recorded successfully!');
      },
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
      onSuccess: () => {
        toast.success('Win removed successfully!');
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to remove win.');
      },
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
      onSuccess: () => {
        toast.success('Loss removed successfully!');
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to remove loss.');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Leaderboard</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Leaderboard</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No players enrolled yet. Players appear automatically when they sign in.
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAvailableDays = availableDays.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Leaderboard</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All-Time Rankings</CardTitle>
          {callerPrincipal && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Select a date to record results:</span>
              </div>
              
              {isLoadingDays ? (
                <div className="text-sm text-muted-foreground">Loading your available dates...</div>
              ) : !hasAvailableDays ? (
                <Alert>
                  <AlertDescription>
                    You must add availability on the Calendar page before you can record wins or losses.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                  <Select value={selectedDay || ''} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue placeholder="Select a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDays.map((day) => (
                        <SelectItem key={day.toString()} value={day.toString()}>
                          {formatDayId(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-4 w-full sm:w-auto">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground text-center">Win</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleRecordWin}
                          disabled={!selectedDay || isPending}
                          size="sm"
                          className="w-16"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleRemoveWin}
                          disabled={!selectedDay || isPending}
                          size="sm"
                          variant="outline"
                          className="w-16"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground text-center">Loss</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleRecordLoss}
                          disabled={!selectedDay || isPending}
                          size="sm"
                          className="w-16"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleRemoveLoss}
                          disabled={!selectedDay || isPending}
                          size="sm"
                          variant="outline"
                          className="w-16"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Games</TableHead>
                <TableHead className="text-right">Win %</TableHead>
                <TableHead className="text-right">Streak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map(([principal, stats], index) => {
                const principalStr = principal.toString();
                const user = userDirectory?.get(principalStr);
                const isCurrentUser = principalStr === callerPrincipal;
                const totalGames = Number(stats.totalGames);
                const winPercentage = totalGames > 0 
                  ? ((Number(stats.wins) / totalGames) * 100).toFixed(1)
                  : '0.0';
                const streak = Number(stats.streak);
                const streakDisplay = streak > 0 ? `+${streak}` : streak < 0 ? `${streak}` : '0';

                return (
                  <TableRow key={principalStr} className={isCurrentUser ? 'bg-muted/50' : ''}>
                    <TableCell className="font-medium">
                      <Badge variant={index < 3 ? 'default' : 'outline'}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AvatarName
                        principal={principal}
                        displayName={user?.displayName || 'Loading...'}
                        avatarUrl={user?.avatarUrl}
                        isLoading={isLoadingDirectory}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">{stats.wins.toString()}</TableCell>
                    <TableCell className="text-right">{stats.losses.toString()}</TableCell>
                    <TableCell className="text-right">{stats.totalGames.toString()}</TableCell>
                    <TableCell className="text-right font-medium">{winPercentage}%</TableCell>
                    <TableCell className="text-right">
                      <span className={streak > 0 ? 'text-green-600 dark:text-green-400' : streak < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                        {streakDisplay}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
