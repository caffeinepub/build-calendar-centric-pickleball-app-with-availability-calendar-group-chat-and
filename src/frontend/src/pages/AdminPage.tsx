import type { Principal } from "@dfinity/principal";
import { Award, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AdminBadgeAwardPanel from "../components/admin/AdminBadgeAwardPanel";
import BadgeManagement from "../components/admin/BadgeManagement";
import AccessDeniedScreen from "../components/auth/AccessDeniedScreen";
import { InlineLoading } from "../components/common/LoadingState";
import { Page, PageHeader } from "../components/layout/PageLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useIsCallerAdmin } from "../hooks/useCurrentUserRole";
import {
  useDeleteUser,
  useDeleteUserDayAvailability,
  useGetAllAvailabilities,
  useGetAllLoginTimestamps,
  useGetAllRegisteredUsers,
} from "../hooks/useQueries";
import { formatDateTime, formatDayId } from "../lib/date";

export default function AdminPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: users = [], isLoading: usersLoading } =
    useGetAllRegisteredUsers();
  const { data: availabilities = [], isLoading: availabilitiesLoading } =
    useGetAllAvailabilities();
  const { data: loginTimestamps } = useGetAllLoginTimestamps();
  const deleteUserMutation = useDeleteUser();
  const deleteAvailabilityMutation = useDeleteUserDayAvailability();

  const [userToDelete, setUserToDelete] = useState<Principal | null>(null);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<{
    user: Principal;
    day: bigint;
  } | null>(null);

  if (isAdminLoading) {
    return (
      <Page>
        <InlineLoading message="Checking permissions..." />
      </Page>
    );
  }

  if (!isAdmin) {
    return <AccessDeniedScreen />;
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserMutation.mutateAsync(userToDelete);
      toast.success("User deleted successfully");
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleDeleteAvailability = async () => {
    if (!availabilityToDelete) return;

    try {
      await deleteAvailabilityMutation.mutateAsync(availabilityToDelete);
      toast.success("Availability deleted successfully");
      setAvailabilityToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete availability");
    }
  };

  return (
    <Page>
      <PageHeader
        icon={<Shield className="h-8 w-8 text-primary" />}
        title="Admin Panel"
      />

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>Manage all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <InlineLoading message="Loading users..." />
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No registered users yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(([principal, profile, createdAt]) => {
                    const lastLogin = loginTimestamps?.get(
                      principal.toString(),
                    );
                    return (
                      <TableRow key={principal.toString()}>
                        <TableCell className="font-medium">
                          {profile.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {principal.toString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastLogin ? formatDateTime(lastLogin) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setUserToDelete(principal)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Card>
        <CardHeader>
          <CardTitle>All Availabilities</CardTitle>
          <CardDescription>Manage all user availabilities</CardDescription>
        </CardHeader>
        <CardContent>
          {availabilitiesLoading ? (
            <InlineLoading message="Loading availabilities..." />
          ) : availabilities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No availabilities yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilities.map(([principal, day, time]) => (
                    <TableRow key={`${principal.toString()}-${day.toString()}`}>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {principal.toString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDayId(day)}
                      </TableCell>
                      <TableCell className="text-sm">{time}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setAvailabilityToDelete({ user: principal, day })
                          }
                          disabled={deleteAvailabilityMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badge Management
          </CardTitle>
          <CardDescription>
            Create, edit, and remove badges with custom award criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BadgeManagement />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            Award / Revoke Badges
          </CardTitle>
          <CardDescription>
            Manually grant or remove badges for any player
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminBadgeAwardPanel />
        </CardContent>
      </Card>

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This will remove all
              their data including availabilities and stats. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!availabilityToDelete}
        onOpenChange={(open) => !open && setAvailabilityToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this availability entry? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAvailability}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
