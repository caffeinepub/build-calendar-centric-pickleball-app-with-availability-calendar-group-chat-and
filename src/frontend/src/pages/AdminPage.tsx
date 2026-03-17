import type { Principal } from "@dfinity/principal";
import {
  Award,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  useCreateBadgeDefinition,
  useDeleteUser,
  useDeleteUserDayAvailability,
  useFinalizeCurrentSeason,
  useGetAllAvailabilities,
  useGetAllBadgeDefinitions,
  useGetAllLoginTimestamps,
  useGetAllRegisteredUsers,
  useGetCurrentSeasonLeaderboard,
  useResetUserBestStreak,
  useResetUserCurrentStreak,
} from "../hooks/useQueries";
import { formatDateTime, formatDayId } from "../lib/date";

/** Returns days remaining until Dec 31 of current year */
function getDaysRemainingInSeason(): number {
  const today = new Date();
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(
    0,
    Math.ceil((yearEnd.getTime() - today.getTime()) / msPerDay),
  );
}

export default function AdminPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: users = [], isLoading: usersLoading } =
    useGetAllRegisteredUsers();
  const { data: availabilities = [], isLoading: availabilitiesLoading } =
    useGetAllAvailabilities();
  const { data: loginTimestamps } = useGetAllLoginTimestamps();
  const { data: badgeDefinitions = [] } = useGetAllBadgeDefinitions();
  const { data: currentSeasonLeaderboard = [] } =
    useGetCurrentSeasonLeaderboard();
  const deleteUserMutation = useDeleteUser();
  const deleteAvailabilityMutation = useDeleteUserDayAvailability();
  const { mutate: finalizeSeasonMutate, isPending: isFinalizingSeason } =
    useFinalizeCurrentSeason();
  const { mutateAsync: createBadgeDefinition, isPending: isCreatingBadge } =
    useCreateBadgeDefinition();
  const { mutateAsync: resetCurrentStreak, isPending: isResettingCurrent } =
    useResetUserCurrentStreak();
  const { mutateAsync: resetBestStreak, isPending: isResettingBest } =
    useResetUserBestStreak();

  const [userToDelete, setUserToDelete] = useState<Principal | null>(null);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<{
    user: Principal;
    day: bigint;
  } | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

  // Streak reset state
  const [streakResetUser, setStreakResetUser] = useState<string>("");
  const [streakResetType, setStreakResetType] = useState<
    "current" | "best" | null
  >(null);

  const currentYear = new Date().getFullYear();
  const daysRemaining = getDaysRemainingInSeason();

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

  const handleConfirmFinalizeSeason = async () => {
    try {
      const hasSeasonChampionBadge = badgeDefinitions.some(
        (b) => b.id === "season-champion",
      );
      if (!hasSeasonChampionBadge) {
        await createBadgeDefinition({
          id: "season-champion",
          name: "Season Champion [Legendary]",
          description:
            "Awarded to the player who finishes #1 on the leaderboard at the end of a season. The highest honor in Somers Scheduler.",
          criteria: {
            __kind__: "topLeaderboardPosition",
            topLeaderboardPosition: 1n,
          },
        });
      }
      finalizeSeasonMutate(BigInt(currentYear), {
        onSuccess: () => {
          setFinalizeDialogOpen(false);
          toast.success("Season finalized! Season Champion badge awarded.");
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to finalize season");
        },
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to create Season Champion badge");
    }
  };

  const selectedUser = users.find(([p]) => p.toString() === streakResetUser);
  const selectedUserName =
    selectedUser?.[1]?.name ?? streakResetUser.slice(0, 8);

  const handleConfirmStreakReset = async () => {
    if (!streakResetUser || !streakResetType) return;
    const userPrincipal = users.find(
      ([p]) => p.toString() === streakResetUser,
    )?.[0];
    if (!userPrincipal) return;
    try {
      if (streakResetType === "current") {
        await resetCurrentStreak(userPrincipal);
        toast.success(`${selectedUserName}'s current streak has been reset.`);
      } else {
        await resetBestStreak(userPrincipal);
        toast.success(
          `${selectedUserName}'s all-time best streak has been reset.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to reset streak");
    } finally {
      setStreakResetType(null);
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

      {/* Streak Management */}
      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streak Management
          </CardTitle>
          <CardDescription>
            Reset a player’s current streak or all-time best streak. These
            actions are irreversible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Select Player</p>
            <Select value={streakResetUser} onValueChange={setStreakResetUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a player..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(([principal, profile]) => (
                  <SelectItem
                    key={principal.toString()}
                    value={principal.toString()}
                  >
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 border-orange-500/40 hover:bg-orange-500/10 text-orange-600"
              disabled={
                !streakResetUser || isResettingCurrent || isResettingBest
              }
              onClick={() => setStreakResetType("current")}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Current Streak
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/40 hover:bg-red-500/10 text-red-600"
              disabled={
                !streakResetUser || isResettingCurrent || isResettingBest
              }
              onClick={() => setStreakResetType("best")}
            >
              <Star className="h-4 w-4 mr-2" />
              Reset All-Time Best Streak
            </Button>
          </div>

          {!streakResetUser && (
            <p className="text-xs text-muted-foreground">
              Select a player above to enable the reset buttons.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Finalize Season */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Finalize Season
          </CardTitle>
          <CardDescription>
            Lock the current season, award the Season Champion badge, and reset
            all scores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>
              Days remaining in{" "}
              <span className="font-semibold text-foreground">
                {currentYear}
              </span>{" "}
              season:{" "}
              <span className="text-primary font-medium">
                {daysRemaining} days
              </span>
            </span>
          </div>
          <div className="text-sm text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2.5 space-y-1">
            <p className="font-medium text-foreground text-xs">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-xs">
              Finalizing will snapshot the current {currentYear} season, award
              the Season Champion badge to the #1 player (
              {currentSeasonLeaderboard.length > 0
                ? `currently #1 has ${Number(currentSeasonLeaderboard[0]?.[1]?.wins ?? 0)} wins`
                : "no players yet"}
              ), and reset all season scores to 0-0.
            </p>
          </div>
          <Button
            onClick={() => setFinalizeDialogOpen(true)}
            disabled={isFinalizingSeason || isCreatingBadge}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-ocid="admin.finalize_season.button"
          >
            {isFinalizingSeason || isCreatingBadge ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Finalize {currentYear} Season
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Streak Reset Confirmation */}
      <AlertDialog
        open={!!streakResetType}
        onOpenChange={(open) => !open && setStreakResetType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset{" "}
              {streakResetType === "current" ? "Current" : "All-Time Best"}{" "}
              Streak?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset <strong>{selectedUserName}</strong>
              ’s{" "}
              {streakResetType === "current"
                ? "current streak"
                : "all-time best streak"}{" "}
              to zero? This cannot be undone.
              {streakResetType === "current"
                ? " A new streak will begin counting from their next recorded results."
                : " Their best streak will rebuild from future results."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingCurrent || isResettingBest}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStreakReset}
              disabled={isResettingCurrent || isResettingBest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResettingCurrent || isResettingBest ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </span>
              ) : (
                "Yes, Reset"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finalize Season confirmation dialog */}
      <AlertDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
      >
        <AlertDialogContent data-ocid="admin.finalize_season.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize {currentYear} Season?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will lock the {currentYear} season and reset
              all scores. The Season Champion badge will be awarded to the #1
              player. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="admin.finalize_season.cancel_button"
              disabled={isFinalizingSeason || isCreatingBadge}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinalizeSeason}
              disabled={isFinalizingSeason || isCreatingBadge}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-ocid="admin.finalize_season.confirm_button"
            >
              {isFinalizingSeason || isCreatingBadge ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </span>
              ) : (
                "Yes, Finalize Season"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
