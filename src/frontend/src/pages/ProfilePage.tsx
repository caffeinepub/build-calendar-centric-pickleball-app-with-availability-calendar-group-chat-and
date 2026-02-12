import { User, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useGetCallerUserProfile } from '../hooks/useCurrentUserProfile';
import { useGetCallerStats } from '../hooks/useQueries';

export default function ProfilePage() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: stats } = useGetCallerStats();

  const winPercentage = stats && stats.totalGames > 0
    ? ((Number(stats.wins) / Number(stats.totalGames)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Profile</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{userProfile?.name || 'Loading...'}</CardTitle>
          <CardDescription>Your pickleball stats and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="Wins"
              value={stats?.wins.toString() || '0'}
            />
            <StatCard
              icon={<TrendingDown className="h-5 w-5 text-red-500" />}
              label="Losses"
              value={stats?.losses.toString() || '0'}
            />
            <StatCard
              icon={<Target className="h-5 w-5 text-blue-500" />}
              label="Win %"
              value={`${winPercentage}%`}
            />
            <StatCard
              icon={<User className="h-5 w-5 text-purple-500" />}
              label="Total Games"
              value={stats?.totalGames.toString() || '0'}
            />
          </div>

          {stats && Number(stats.streak) !== 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Streak</span>
                <Badge variant={Number(stats.streak) > 0 ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                  {Number(stats.streak) > 0 ? '+' : ''}{stats.streak.toString()}
                </Badge>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Match History</h3>
            <p className="text-sm text-muted-foreground">
              Match history feature coming soon. Track individual game results and view detailed performance analytics.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Settings</h3>
            <p className="text-sm text-muted-foreground">
              Settings and preferences coming soon. Customize notifications, display options, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
