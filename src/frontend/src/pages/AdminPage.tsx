import { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { Trash2, Calendar, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { useIsCallerAdmin } from '../hooks/useCurrentUserRole';
import { useDeleteUser, useDeleteAllDayAvailabilities, useGetAllLoginTimestamps } from '../hooks/useQueries';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { formatTime } from '../lib/date';
import AccessDeniedScreen from '../components/auth/AccessDeniedScreen';

export default function AdminPage() {
  const { data: isAdmin, isLoading } = useIsCallerAdmin();
  const [userPrincipal, setUserPrincipal] = useState('');
  const [dayId, setDayId] = useState('');

  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const { mutate: deleteDay, isPending: isDeletingDay } = useDeleteAllDayAvailabilities();
  const { data: loginTimestamps = [] } = useGetAllLoginTimestamps();

  const principals = loginTimestamps.map(([principal]) => principal);
  const { data: userDirectory } = useUserDirectory(principals);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDeniedScreen />;
  }

  const handleDeleteUser = () => {
    if (!userPrincipal.trim()) return;
    
    try {
      const principal = Principal.fromText(userPrincipal.trim());
      deleteUser(principal, {
        onSuccess: () => {
          setUserPrincipal('');
          alert('User deleted successfully');
        },
        onError: (error) => {
          alert(`Error deleting user: ${error}`);
        },
      });
    } catch (error) {
      alert('Invalid principal format');
    }
  };

  const handleDeleteDay = () => {
    if (!dayId.trim()) return;
    
    try {
      const day = BigInt(dayId.trim());
      deleteDay(day, {
        onSuccess: () => {
          setDayId('');
          alert('Day availabilities deleted successfully');
        },
        onError: (error) => {
          alert(`Error deleting day: ${error}`);
        },
      });
    } catch (error) {
      alert('Invalid day ID format');
    }
  };

  const sortedLogins = [...loginTimestamps].sort((a, b) => {
    const timeA = Number(a[1]);
    const timeB = Number(b[1]);
    return timeB - timeA;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Admin Panel</h2>
        <p className="text-muted-foreground mt-1">Manage users, availabilities, and monitor activity</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Delete User
            </CardTitle>
            <CardDescription>
              Remove a user and all their data from the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userPrincipal">User Principal</Label>
              <Input
                id="userPrincipal"
                placeholder="Enter principal ID..."
                value={userPrincipal}
                onChange={(e) => setUserPrincipal(e.target.value)}
              />
            </div>
            <Button
              onClick={handleDeleteUser}
              disabled={!userPrincipal.trim() || isDeletingUser}
              variant="destructive"
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeletingUser ? 'Deleting...' : 'Delete User'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Delete Day Availabilities
            </CardTitle>
            <CardDescription>
              Remove all availabilities for a specific day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dayId">Day ID</Label>
              <Input
                id="dayId"
                placeholder="Enter day ID (e.g., 20260212)..."
                value={dayId}
                onChange={(e) => setDayId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleDeleteDay}
              disabled={!dayId.trim() || isDeletingDay}
              variant="destructive"
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeletingDay ? 'Deleting...' : 'Delete Day'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            User Login Activity
          </CardTitle>
          <CardDescription>
            Monitor when users last logged in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedLogins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No login records available</p>
          ) : (
            <div className="space-y-3">
              {sortedLogins.map(([principal, timestamp], index) => {
                const displayName = userDirectory?.get(principal.toString()) || 'Loading...';
                
                return (
                  <div key={index}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{principal.toString()}</p>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTime(timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
