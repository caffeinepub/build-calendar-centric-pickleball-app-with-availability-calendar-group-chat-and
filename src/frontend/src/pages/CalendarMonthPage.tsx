import { Link } from "@tanstack/react-router";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WeatherIcon } from "../components/calendar/WeatherIcon";
import ChatPanel from "../components/chat/ChatPanel";
import { Page, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useGetAllDayAvailabilityCounts } from "../hooks/useQueries";
import {
  formatMonthYear,
  getDayId,
  getMonthGridDays,
  isToday,
} from "../lib/date";
import { type DayWeather, fetchAllWeather } from "../services/weatherService";

export default function CalendarMonthPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const gridDays = getMonthGridDays(year, month);

  const { data: countsMap } = useGetAllDayAvailabilityCounts();

  // Weather: today (current API) + 5-day forecast
  const [weatherByDate, setWeatherByDate] = useState<Map<string, DayWeather>>(
    new Map(),
  );

  useEffect(() => {
    fetchAllWeather().then(setWeatherByDate);
  }, []);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <Page>
      <PageHeader
        icon={<Calendar className="h-8 w-8 text-primary" />}
        title="Calendar"
        action={
          <Link to="/add-availability">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Availability
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle>{formatMonthYear(currentDate)}</CardTitle>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1.5 sm:py-2"
              >
                {day}
              </div>
            ))}
            {gridDays.map((date) => {
              const isCurrentMonth = date.getMonth() === month;
              const dayId = getDayId(date);
              const count = countsMap?.get(dayId.toString()) ?? 0;
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, "0");
              const dd = String(date.getDate()).padStart(2, "0");
              const weatherKey = `${yyyy}-${mm}-${dd}`;
              const weather = weatherByDate.get(weatherKey);

              return (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  dayId={dayId}
                  isCurrentMonth={isCurrentMonth}
                  count={count}
                  weather={weather}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div
        className="flex-1 min-h-0"
        style={{
          height: "calc(100dvh - 400px)",
          minHeight: "600px",
          maxHeight: "1334px",
        }}
      >
        <ChatPanel />
      </div>
    </Page>
  );
}

function DayCell({
  date,
  dayId,
  isCurrentMonth,
  count,
  weather,
}: {
  date: Date;
  dayId: bigint;
  isCurrentMonth: boolean;
  count: number;
  weather?: DayWeather;
}) {
  const today = isToday(date);

  return (
    <Link to="/day/$date" params={{ date: dayId.toString() }} className="block">
      <div
        className={`
          relative rounded-lg border transition-colors hover:bg-accent
          flex flex-col items-center justify-between
          min-h-[60px] sm:min-h-[70px] md:min-h-[80px]
          px-2 py-2
          ${isCurrentMonth ? "bg-card" : "bg-muted/30"}
          ${count > 0 ? "bg-primary/5" : ""}
          ${today ? "border-primary border-2" : ""}
        `}
      >
        {/* Weather icon — top-right corner, absolutely positioned */}
        {weather && (
          <div className="absolute top-1 right-1">
            <WeatherIcon condition={weather.condition} size={11} />
          </div>
        )}

        <div
          className={`text-sm sm:text-base font-medium ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}
        >
          {date.getDate()}
        </div>
        <div className="h-5 flex items-center justify-center">
          {count > 0 && (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
