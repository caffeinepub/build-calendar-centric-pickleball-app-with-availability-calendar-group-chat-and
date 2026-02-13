import { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Calendar, Clock, Edit, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
import { useAvailabilityNotifications } from '../hooks/useInAppNotifications';
import { dateFromDayId, formatDate } from '../lib/date';
import AvatarName from '../components/user/AvatarName';
import { toast } from 'sonner';

export default function DayDetailPage() {
  const { date: dateParam } = useParams({ from: '/day/$date' });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const dayId = BigInt(dateParam);
  const date = dateFromDayId(dayId);
  
  const { data: availabilities = [], isLoading } = useGetDayAvailability(dayId);
  const principals = availabilities.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { mutate: deleteAvailability, isPending: isDeleting } = useDeleteCallerDayAvailability();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [availabilityToDelete, setAvailabilityToDelete] = useState<bigint | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString();

  // Enable availability notifications for this specific day
  useAvailabilityNotifications(dayId, true);

  const handleEdit = () => {
    navigate({ 
      to: '/add-availability',
      search: { day: dayId.toString() }
    });
  };

  const handleDeleteClick = () => {
    setAvailabilityToDelete(dayId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (availabilityToDelete === null) return;

    deleteAvailability(availabilityToDelete, {
      onSuccess: () => {
        toast.success('Availability deleted successfully');
        setDeleteDialogOpen(false);
        setAvailabilityToDelete(null);
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to delete availability');
      },
    });
  };

  const handleAddAvailability = () => {
    navigate({ 
      to: '/add-availability',
      search: { day: dayId.toString() }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading availability...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const callerAvailability = availabilities.find(([principal]) => 
    principal.toString() === callerPrincipal
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">{formatDate(date)}</h2>
            <p className="text-muted-foreground">Who's available to play</p>
          </div>
        </div>
        {!callerAvailability && (
          <Button onClick={handleAddAvailability}>
            <Plus className="h-4 w-4 mr-2" />
            Add Availability
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Players ({availabilities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {availabilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No one is available on this date yet. Be the first to add your availability!
            </div>
          ) : (
            <div className="space-y-4">
              {availabilities.map(([principal, availability], index) => {
                const principalStr = principal.toString();
                const user = userDirectory?.get(principalStr);
                const isCurrentUser = principalStr === callerPrincipal;

                return (
                  <div key={principalStr}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <AvatarName
                          principal={principal}
                          displayName={user?.displayName || 'Loading...'}
                          avatarUrl={user?.avatarUrl}
                          isLoading={isLoadingDirectory}
                          size="md"
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{availability.time}</span>
                        </div>
                        {availability.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {availability.notes}
                          </p>
                        )}
                      </div>
                      {isCurrentUser && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteClick}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your availability for {formatDate(date)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
