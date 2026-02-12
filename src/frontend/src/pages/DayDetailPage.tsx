import { useState } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Clock, StickyNote, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
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
import { useGetDayAvailability, useDeleteCallerDayAvailability } from '../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../hooks/useUserDirectory';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { dateFromDayId, formatDate } from '../lib/date';
import AvatarName from '../components/user/AvatarName';
import { toast } from 'sonner';

export default function DayDetailPage() {
  const { date: dateParam } = useParams({ from: '/day/$date' });
  const dayId = BigInt(dateParam);
  const date = dateFromDayId(dayId);
  const navigate = useNavigate();

  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toString();

  const { data: availabilities = [], isLoading } = useGetDayAvailability(dayId);
  const principals = availabilities.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);

  const { mutate: deleteAvailability, isPending: isDeleting } = useDeleteCallerDayAvailability();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [principalToDelete, setPrincipalToDelete] = useState<string | null>(null);

  const handleEditClick = () => {
    navigate({ to: '/add-availability', search: { date: dayId.toString() } });
  };

  const handleDeleteClick = (principal: string) => {
    setPrincipalToDelete(principal);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteAvailability(dayId, {
      onSuccess: () => {
        toast.success('Your availability has been deleted');
        setDeleteDialogOpen(false);
        setPrincipalToDelete(null);
      },
      onError: (error) => {
        toast.error(`Failed to delete availability: ${error.message}`);
        setDeleteDialogOpen(false);
        setPrincipalToDelete(null);
      },
    });
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold">{formatDate(date)}</h2>
      </div>

      {availabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <img
              src="/assets/generated/calendar-empty.dim_1200x800.png"
              alt="No availability"
              className="mx-auto mb-6 h-48 w-auto opacity-50"
            />
            <p className="text-lg text-muted-foreground mb-4">
              No one is available on this day yet
            </p>
            <Link to="/add-availability" search={{ date: dayId.toString() }}>
              <Button>Add Your Availability</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Players ({availabilities.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availabilities.map(([principal, availability], index) => {
                const userEntry = userDirectory?.get(principal.toString());
                const displayName = userEntry?.displayName || 'Loading...';
                const avatarUrl = userEntry?.avatarUrl;
                const isCurrentUser = currentPrincipal === principal.toString();
                
                return (
                  <div key={principal.toString()}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <AvatarName
                          principal={principal}
                          displayName={displayName}
                          avatarUrl={avatarUrl}
                          size="md"
                          isLoading={isLoadingDirectory}
                        />
                        {isCurrentUser && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditClick}
                              disabled={isDeleting}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(principal.toString())}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {isDeleting && principalToDelete === principal.toString() ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {availability.time}
                      </div>
                      {availability.notes && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <StickyNote className="h-4 w-4 mt-0.5" />
                          <span>{availability.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Link to="/add-availability" search={{ date: dayId.toString() }}>
            <Button className="w-full">Add Your Availability</Button>
          </Link>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your availability for {formatDate(date)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
