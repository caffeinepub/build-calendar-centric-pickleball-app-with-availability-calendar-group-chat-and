import { User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import ProfileCard from '../components/profile/ProfileCard';

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
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>View your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Match History</h3>
            <p className="text-sm text-muted-foreground">
              Match history feature coming soon. Track individual game results and view detailed performance analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
