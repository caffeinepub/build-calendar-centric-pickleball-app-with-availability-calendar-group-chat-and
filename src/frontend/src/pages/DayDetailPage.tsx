import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, StickyNote } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { useGetDayAvailability } from '../hooks/useQueries';
import { useUserDirectory } from '../hooks/useUserDirectory';
import { dateFromDayId, formatDate } from '../lib/date';

export default function DayDetailPage() {
  const { date: dateParam } = useParams({ from: '/day/$date' });
  const dayId = BigInt(dateParam);
  const date = dateFromDayId(dayId);

  const { data: availabilities = [], isLoading } = useGetDayAvailability(dayId);
  const principals = availabilities.map(([principal]) => principal);
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
                const displayName = userDirectory?.get(principal.toString()) || 'Loading...';
                
                return (
                  <div key={principal.toString()}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="font-semibold">{displayName}</div>
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
    </div>
  );
}
