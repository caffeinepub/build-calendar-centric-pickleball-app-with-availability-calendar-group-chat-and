import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ProfileCard from '../components/profile/ProfileCard';
import ProfileLeaderboardRanks from '../components/profile/ProfileLeaderboardRanks';
import ProfileMatchHistory from '../components/profile/ProfileMatchHistory';

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Profile</h2>
      </div>

      <ProfileCard />

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard Ranking</CardTitle>
          <CardDescription>Your current all-time ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileLeaderboardRanks />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
          <CardDescription>Your wins and losses for the last 5 availabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileMatchHistory />
        </CardContent>
      </Card>
    </div>
  );
}
