import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WeatherIcon } from "../components/calendar/WeatherIcon";
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
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import AvatarName from "../components/user/AvatarName";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteCallerDayAvailability,
  useGetDayAvailability,
} from "../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../hooks/useUserDirectory";
import { formatDate } from "../lib/date";
import {
  type DayWeather,
  type HourlySlot,
  fetchAllWeather,
  fetchHourlyForecastByDate,
} from "../services/weatherService";

export default function DayDetailPage() {
  const { date } = useParams({ strict: false }) as { date: string };
  const navigate = useNavigate();
  const dayId = BigInt(date);
  const { data: availabilities = [], isLoading } = useGetDayAvailability(dayId);
  const principals = availabilities.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } =
    useUserDirectoryWithAvatars(principals);
  const { identity } = useInternetIdentity();
  const { mutate: deleteAvailability, isPending: isDeleting } =
    useDeleteCallerDayAvailability();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [hourlySlots, setHourlySlots] = useState<HourlySlot[]>([]);

  const callerPrincipal = identity?.getPrincipal().toString();

  const dateObj = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );

  // Load weather for this specific date — uses current weather API for today,
  // forecast API for upcoming days
  useEffect(() => {
    const yyyy = date.slice(0, 4);
    const mm = date.slice(4, 6);
    const dd = date.slice(6, 8);
    const weatherKey = `${yyyy}-${mm}-${dd}`;

    Promise.all([
      fetchAllWeather().then((map) => {
        setWeather(map.get(weatherKey) ?? null);
      }),
      fetchHourlyForecastByDate(weatherKey).then(setHourlySlots),
    ]);
  }, [date]);

  const handleDelete = () => {
    deleteAvailability(dayId, {
      onSuccess: () => {
        toast.success("Availability deleted successfully");
        setShowDeleteDialog(false);
        navigate({ to: "/" });
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to delete availability");
        setShowDeleteDialog(false);
      },
    });
  };

  const renderWeatherCard = (w: DayWeather) => (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40"
      data-ocid="calendar.weather_card"
    >
      <WeatherIcon condition={w.condition} size={24} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize">{w.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
          <span>
            {w.tempHigh}° / {w.tempLow}°F
          </span>
          {w.precipChance > 0 && <span>💧 {w.precipChance}% precip</span>}
          {w.windSpeed > 0 && <span>💨 {w.windSpeed} mph</span>}
        </div>
      </div>
    </div>
  );

  const renderHourlyForecast = (slots: HourlySlot[]) => {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          3-Hour Forecast
        </p>
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {slots.map((slot) => (
            <div
              key={slot.time}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-muted/30 border border-border/30 min-w-[72px]"
            >
              <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                {slot.time}
              </span>
              <img
                src={`https://openweathermap.org/img/wn/${slot.icon}.png`}
                alt={slot.condition}
                className="w-8 h-8"
              />
              <span className="text-sm font-bold text-foreground">
                {slot.temp}°
              </span>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">
                {slot.condition}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Page maxWidth="4xl">
        <PageHeader
          icon={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/" })}
            >
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
          title={formatDate(dateObj)}
        />
        <Card>
          <CardContent className="py-6 space-y-4">
            {weather && renderWeatherCard(weather)}
            {hourlySlots.length > 0 && renderHourlyForecast(hourlySlots)}
            <Link to="/add-availability" search={{ date }}>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Availability
              </Button>
            </Link>
            <div className="py-6 text-center text-muted-foreground">
              No one is available on this date yet.
            </div>
          </CardContent>
        </Card>
      </Page>
    );
  }

  return (
    <Page maxWidth="4xl">
      <PageHeader
        icon={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
          >
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
          {weather && renderWeatherCard(weather)}
          {hourlySlots.length > 0 && renderHourlyForecast(hourlySlots)}

          <Link to="/add-availability" search={{ date }}>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Availability
            </Button>
          </Link>

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
                      displayName={user?.displayName || "Loading..."}
                      avatarUrl={user?.avatarUrl}
                      isLoading={isLoadingDirectory}
                      size="md"
                    />
                    {isCurrentUser && (
                      <div className="flex gap-2">
                        <Link to="/add-availability" search={{ date }}>
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
                          data-ocid="availability.delete_button"
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
                      <p className="text-muted-foreground">
                        {availability.notes}
                      </p>
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
              Are you sure you want to delete your availability for this date?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="availability.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              data-ocid="availability.confirm_button"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
