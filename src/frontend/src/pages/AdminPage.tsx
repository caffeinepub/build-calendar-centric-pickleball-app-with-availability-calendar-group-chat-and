import { useState } from 'react';
import { Trash2, Users, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useIsCallerAdmin } from '../hooks/useCurrentUserRole';
import { 
  useDeleteUser, 
  useGetAllRegisteredUsers, 
  useGetAllAvailabilities,
  useDeleteUserDayAvailability,
  useGetAllLoginTimestamps
} from '../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../hooks/useUserDirectory';
import { formatDateTime, formatDayId } from '../lib/date';
import AccessDeniedScreen from '../components/auth/AccessDeniedScreen';
import AvatarName from '../components/user/AvatarName';
import { Principal } from '@dfinity/principal';

export default function AdminPage() {
  const { data: isAdmin, isLoading } = useIsCallerAdmin();
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useGetAllRegisteredUsers();
  const { data: allAvailabilities = [], isLoading: isLoadingAvailabilities } = useGetAllAvailabilities();
  const { data: loginTimestamps = [], isLoading: isLoadingTimestamps } = useGetAllLoginTimestamps();
  
  const { mutate: deleteUser } = useDeleteUser();
  const { mutate: deleteAvailability } = useDeleteUserDayAvailability();

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingAvailabilityId, setDeletingAvailabilityId] = useState<string | null>(null);

  const userPrincipals = registeredUsers.map(([principal]) => principal);
  const availabilityPrincipals = allAvailabilities.map(([principal]) => principal);
  const allPrincipals = [...new Set([...userPrincipals, ...availabilityPrincipals])];
  
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(allPrincipals);

  // Create a map of login timestamps for quick lookup
  const loginTimestampMap = new Map<string, bigint>();
  loginTimestamps.forEach(([principal, timestamp]) => {
    loginTimestampMap.set(principal.toString(), timestamp);
  });

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

  const handleDeleteUser = (principalStr: string) => {
    setDeletingUserId(principalStr);
    const principal = Principal.fromText(principalStr);
    deleteUser(principal, {
      onSettled: () => {
        setDeletingUserId(null);
      },
    });
  };

  const handleDeleteAvailability = (principalStr: string, day: bigint) => {
    const id = `${principalStr}-${day}`;
    setDeletingAvailabilityId(id);
    const principal = Principal.fromText(principalStr);
    deleteAvailability(
      { user: principal, day },
      {
        onSettled: () => {
          setDeletingAvailabilityId(null);
        },
      }
    );
  };

  const sortedUsers = [...registeredUsers].sort((a, b) => {
    const timeA = Number(a[2]);
    const timeB = Number(b[2]);
    return timeB - timeA;
  });

  const sortedAvailabilities = [...allAvailabilities].sort((a, b) => {
    const dayA = Number(a[1]);
    const dayB = Number(b[1]);
    return dayB - dayA;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Admin Panel</h2>
        <p className="text-muted-foreground mt-1">Manage users and availabilities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Users
          </CardTitle>
          <CardDescription>
            All users registered in the system with their creation date and latest sign-in time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers || isLoadingTimestamps ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No registered users</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Latest Sign-In</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map(([principal, profile, createdAt]) => {
                    const principalStr = principal.toString();
                    const userEntry = userDirectory?.get(principalStr);
                    const displayName = userEntry?.displayName || profile.name || 'Loading...';
                    const avatarUrl = userEntry?.avatarUrl;
                    const isDeleting = deletingUserId === principalStr;
                    const lastLogin = loginTimestampMap.get(principalStr);

                    return (
                      <TableRow key={principalStr}>
                        <TableCell>
                          <AvatarName
                            principal={principal}
                            displayName={displayName}
                            avatarUrl={avatarUrl}
                            size="sm"
                            isLoading={isLoadingDirectory}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastLogin ? formatDateTime(lastLogin) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(principalStr)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Availabilities
          </CardTitle>
          <CardDescription>
            All user availabilities across all dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAvailabilities ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedAvailabilities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No availabilities</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAvailabilities.map(([principal, day, time]) => {
                    const principalStr = principal.toString();
                    const userEntry = userDirectory?.get(principalStr);
                    const displayName = userEntry?.displayName || 'Loading...';
                    const avatarUrl = userEntry?.avatarUrl;
                    const id = `${principalStr}-${day}`;
                    const isDeleting = deletingAvailabilityId === id;

                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <AvatarName
                            principal={principal}
                            displayName={displayName}
                            avatarUrl={avatarUrl}
                            size="sm"
                            isLoading={isLoadingDirectory}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDayId(day)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {time}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAvailability(principalStr, day)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
