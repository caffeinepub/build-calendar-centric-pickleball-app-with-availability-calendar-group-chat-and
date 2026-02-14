import { useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useGetAllRegisteredUsers, useGetAllAvailabilities, useDeleteUser, useDeleteUserDayAvailability } from '../hooks/useQueries';
import { useIsCallerAdmin } from '../hooks/useCurrentUserRole';
import { formatDateTime, formatDayId } from '../lib/date';
import { toast } from 'sonner';
import AccessDeniedScreen from '../components/auth/AccessDeniedScreen';
import { Page, PageHeader } from '../components/layout/PageLayout';
import { InlineLoading } from '../components/common/LoadingState';
import type { Principal } from '@dfinity/principal';

export default function AdminPage() {
  const { data: isAdmin, isLoading: isLoadingRole } = useIsCallerAdmin();
  const { data: users = [], isLoading: isLoadingUsers } = useGetAllRegisteredUsers();
  const { data: availabilities = [], isLoading: isLoadingAvailabilities } = useGetAllAvailabilities();
  const { mutate: deleteUser, isPending: isDeletingUser } = useDeleteUser();
  const { mutate: deleteAvailability, isPending: isDeletingAvailability } = useDeleteUserDayAvailability();

  const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; principal: Principal | null }>({
    open: false,
    principal: null,
  });
  const [deleteAvailabilityDialog, setDeleteAvailabilityDialog] = useState<{
    open: boolean;
    principal: Principal | null;
    day: bigint | null;
  }>({
    open: false,
    principal: null,
    day: null,
  });

  const handleDeleteUser = () => {
    if (!deleteUserDialog.principal) return;

    deleteUser(deleteUserDialog.principal, {
      onSuccess: () => {
        toast.success('User deleted successfully');
        setDeleteUserDialog({ open: false, principal: null });
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to delete user');
        setDeleteUserDialog({ open: false, principal: null });
      },
    });
  };

  const handleDeleteAvailability = () => {
    if (!deleteAvailabilityDialog.principal || !deleteAvailabilityDialog.day) return;

    deleteAvailability(
      { user: deleteAvailabilityDialog.principal, day: deleteAvailabilityDialog.day },
      {
        onSuccess: () => {
          toast.success('Availability deleted successfully');
          setDeleteAvailabilityDialog({ open: false, principal: null, day: null });
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to delete availability');
          setDeleteAvailabilityDialog({ open: false, principal: null, day: null });
        },
      }
    );
  };

  if (isLoadingRole) {
    return (
      <Page>
        <PageHeader
          icon={<Shield className="h-8 w-8 text-primary" />}
          title="Admin Panel"
        />
        <Card>
          <CardContent className="py-12">
            <InlineLoading message="Checking permissions..." />
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!isAdmin) {
    return <AccessDeniedScreen />;
  }

  return (
    <Page>
      <PageHeader
        icon={<Shield className="h-8 w-8 text-primary" />}
        title="Admin Panel"
      />

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>All users who have created profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <InlineLoading message="Loading users..." size="sm" />
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No registered users yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(([principal, profile, createdAt]) => (
                  <TableRow key={principal.toString()}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="font-mono text-xs">{principal.toString().slice(0, 20)}...</TableCell>
                    <TableCell>{formatDateTime(createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteUserDialog({ open: true, principal })}
                        disabled={isDeletingUser}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Availabilities</CardTitle>
          <CardDescription>All availability entries across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAvailabilities ? (
            <InlineLoading message="Loading availabilities..." size="sm" />
          ) : availabilities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No availabilities yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availabilities.map(([principal, day, time]) => (
                  <TableRow key={`${principal.toString()}-${day.toString()}`}>
                    <TableCell className="font-mono text-xs">{principal.toString().slice(0, 20)}...</TableCell>
                    <TableCell>{formatDayId(day)}</TableCell>
                    <TableCell>{time}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteAvailabilityDialog({ open: true, principal, day })}
                        disabled={isDeletingAvailability}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteUserDialog.open} onOpenChange={(open) => setDeleteUserDialog({ open, principal: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This will remove their profile, stats, and all availabilities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteAvailabilityDialog.open}
        onOpenChange={(open) => setDeleteAvailabilityDialog({ open, principal: null, day: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this availability entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAvailability} disabled={isDeletingAvailability}>
              {isDeletingAvailability ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
