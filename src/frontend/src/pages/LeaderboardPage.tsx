import { useState } from 'react';
import { Trophy, Plus, Minus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
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
import { formatDayId, formatTimeframeWindow } from '../lib/date';
import { toast } from 'sonner';

type TimeFilter = 'weekly' | 'monthly' | 'all';

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Leaderboard</h2>
      </div>

      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <LeaderboardTable timeFilter="weekly" />
        </TabsContent>
        <TabsContent value="monthly">
          <LeaderboardTable timeFilter="monthly" />
        </TabsContent>
        <TabsContent value="all">
          <LeaderboardTable timeFilter="all" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ timeFilter }: { timeFilter: string }) {
  const { data: leaderboard = [], isLoading, isFetching } = useGetLeaderboard(timeFilter);
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
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  const hasAvailableDays = availableDays.length > 0;
  
  // Calculate the timeframe window display
  const timeframeDisplay = formatTimeframeWindow(timeFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rankings</CardTitle>
          <div className="text-sm text-muted-foreground">
            {isFetching && <span className="mr-2">⟳</span>}
            {timeframeDisplay}
          </div>
        </div>
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
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[240px]">
                    <SelectValue placeholder="Choose an available date" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDays.map((day) => (
                      <SelectItem key={day.toString()} value={day.toString()}>
                        {formatDayId(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-3 flex-wrap">
                  {/* Win Section */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Win</span>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-16"
                        onClick={handleRecordWin}
                        disabled={!selectedDay || isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-16"
                        onClick={handleRemoveWin}
                        disabled={!selectedDay || isPending}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Loss Section */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Loss</span>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-16"
                        onClick={handleRecordLoss}
                        disabled={!selectedDay || isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-16"
                        onClick={handleRemoveLoss}
                        disabled={!selectedDay || isPending}
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
        {leaderboard.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {timeFilter === 'all' 
              ? 'No players enrolled yet. Players appear automatically when they sign in.'
              : `No results recorded in the ${timeFilter === 'weekly' ? 'last 7 days' : 'last 30 days'}.`
            }
          </div>
        ) : (
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
                const userEntry = userDirectory?.get(principal.toString());
                const displayName = userEntry?.displayName || 'Loading...';
                const avatarUrl = userEntry?.avatarUrl;
                const winPercentage = stats.totalGames > 0
                  ? ((Number(stats.wins) / Number(stats.totalGames)) * 100).toFixed(1)
                  : '0.0';
                
                return (
                  <TableRow key={principal.toString()}>
                    <TableCell className="font-medium">
                      {index === 0 && <Trophy className="inline h-4 w-4 text-yellow-500 mr-1" />}
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <AvatarName
                        principal={principal}
                        displayName={displayName}
                        avatarUrl={avatarUrl}
                        size="md"
                        isLoading={isLoadingDirectory}
                      />
                    </TableCell>
                    <TableCell className="text-right">{stats.wins.toString()}</TableCell>
                    <TableCell className="text-right">{stats.losses.toString()}</TableCell>
                    <TableCell className="text-right">{stats.totalGames.toString()}</TableCell>
                    <TableCell className="text-right">{winPercentage}%</TableCell>
                    <TableCell className="text-right">
                      {Number(stats.streak) !== 0 && (
                        <Badge variant={Number(stats.streak) > 0 ? 'default' : 'destructive'}>
                          {Number(stats.streak) > 0 ? '+' : ''}{stats.streak.toString()}
                        </Badge>
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
  );
}
