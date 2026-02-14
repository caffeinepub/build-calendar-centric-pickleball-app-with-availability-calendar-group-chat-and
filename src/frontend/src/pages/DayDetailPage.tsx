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
import { formatDate } from '../lib/date';
import AvatarName from '../components/user/AvatarName';
import { toast } from 'sonner';
import { Page, PageHeader } from '../components/layout/PageLayout';
import { InlineLoading } from '../components/common/LoadingState';

export default function DayDetailPage() {
  const { date } = useParams({ strict: false }) as { date: string };
  const navigate = useNavigate();
  const dayId = BigInt(date);
  const { data: availabilities = [], isLoading } = useGetDayAvailability(dayId);
  const principals = availabilities.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { identity } = useInternetIdentity();
  const { mutate: deleteAvailability, isPending: isDeleting } = useDeleteCallerDayAvailability();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const callerPrincipal = identity?.getPrincipal().toString();

  const dateObj = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8))
  );

  const handleDelete = () => {
    deleteAvailability(dayId, {
      onSuccess: () => {
        toast.success('Availability deleted successfully');
        setShowDeleteDialog(false);
        navigate({ to: '/' });
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to delete availability');
        setShowDeleteDialog(false);
      },
    });
  };

  if (isLoading) {
    return (
      <Page maxWidth="4xl">
        <PageHeader
          icon={
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
          title={formatDate(dateObj)}
        />
        <Card>
          <CardContent className="py-12">
            <InlineLoading message="Loading availability..." />
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (availabilities.length === 0) {
    return (
      <Page maxWidth="4xl">
        <PageHeader
          icon={
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
          title={formatDate(dateObj)}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No one is available on this date yet.
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page maxWidth="4xl">
      <PageHeader
        icon={
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        title={formatDate(dateObj)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availabilities.map(([principal, availability], index) => {
            const principalStr = principal.toString();
            const user = userDirectory?.get(principalStr);
            const isCurrentUser = principalStr === callerPrincipal;

            return (
              <div key={principalStr}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <AvatarName
                      principal={principal}
                      displayName={user?.displayName || 'Loading...'}
                      avatarUrl={user?.avatarUrl}
                      isLoading={isLoadingDirectory}
                      size="md"
                    />
                    {isCurrentUser && (
                      <div className="flex gap-2">
                        <Link
                          to="/add-availability"
                          search={{ date }}
                        >
                          <Button variant="outline" size="sm" className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive"
                          onClick={() => setShowDeleteDialog(true)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{availability.time}</span>
                  </div>

                  {availability.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-muted-foreground">{availability.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your availability for this date? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
