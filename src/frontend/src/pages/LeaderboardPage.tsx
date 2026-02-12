import { useState } from 'react';
import { Trophy, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useGetLeaderboard, useRecordWin, useRecordLoss } from '../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../hooks/useUserDirectory';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AvatarName from '../components/user/AvatarName';

type TimeFilter = 'weekly' | 'monthly' | 'all-time';

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all-time');

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
          <TabsTrigger value="all-time">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <LeaderboardTable timeFilter="weekly" />
        </TabsContent>
        <TabsContent value="monthly">
          <LeaderboardTable timeFilter="monthly" />
        </TabsContent>
        <TabsContent value="all-time">
          <LeaderboardTable timeFilter="all-time" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ timeFilter }: { timeFilter: string }) {
  const { data: leaderboard = [], isLoading } = useGetLeaderboard(timeFilter);
  const principals = leaderboard.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { identity } = useInternetIdentity();
  const { mutate: recordWin, isPending: isRecordingWin } = useRecordWin();
  const { mutate: recordLoss, isPending: isRecordingLoss } = useRecordLoss();

  const callerPrincipal = identity?.getPrincipal().toString();

  const handleRecordWin = () => {
    recordWin();
  };

  const handleRecordLoss = () => {
    recordLoss();
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

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No players enrolled yet. Players appear automatically when they sign in.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Wins</TableHead>
              <TableHead className="text-right">Losses</TableHead>
              <TableHead className="text-right">Win %</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
              const isCurrentUser = callerPrincipal === principal.toString();
              
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
                  <TableCell className="text-right">{winPercentage}%</TableCell>
                  <TableCell className="text-right">{stats.totalGames.toString()}</TableCell>
                  <TableCell className="text-right">
                    {Number(stats.streak) !== 0 && (
                      <Badge variant={Number(stats.streak) > 0 ? 'default' : 'destructive'}>
                        {Number(stats.streak) > 0 ? '+' : ''}{stats.streak.toString()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isCurrentUser && (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={handleRecordWin}
                          disabled={isRecordingWin || isRecordingLoss}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={handleRecordLoss}
                          disabled={isRecordingWin || isRecordingLoss}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
