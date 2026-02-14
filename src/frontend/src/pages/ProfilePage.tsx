import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ProfileCard from '../components/profile/ProfileCard';
import ProfileLeaderboardRanks from '../components/profile/ProfileLeaderboardRanks';
import ProfileMatchHistory from '../components/profile/ProfileMatchHistory';
import { Page, PageHeader } from '../components/layout/PageLayout';

export default function ProfilePage() {
  return (
    <Page maxWidth="4xl">
      <PageHeader
        icon={<User className="h-8 w-8 text-primary" />}
        title="Profile"
      />

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
    </Page>
  );
}
