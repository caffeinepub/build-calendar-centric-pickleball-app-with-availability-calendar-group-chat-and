import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useHasAvailability } from '../hooks/useQueries';
import { getDayId, getMonthGridDays, formatMonthYear, isToday } from '../lib/date';
import ChatPanel from '../components/chat/ChatPanel';

export default function CalendarMonthPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const gridDays = getMonthGridDays(year, month);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Calendar</h2>
        <Link to="/add-availability">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Availability
          </Button>
        </Link>
      </div>

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
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1.5 sm:py-2">
                {day}
              </div>
            ))}
            {gridDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === month;
              const dayId = getDayId(date);
              
              return (
                <DayCell
                  key={index}
                  date={date}
                  dayId={dayId}
                  isCurrentMonth={isCurrentMonth}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div style={{ height: 'clamp(400px, calc(100vh - 700px), 667px)' }}>
        <ChatPanel />
      </div>
    </div>
  );
}

function DayCell({ date, dayId, isCurrentMonth }: { date: Date; dayId: bigint; isCurrentMonth: boolean }) {
  const { data: hasAvailability } = useHasAvailability(dayId);
  const today = isToday(date);

  return (
    <Link
      to="/day/$date"
      params={{ date: dayId.toString() }}
      className="block"
    >
      <div
        className={`
          relative rounded-lg border transition-colors hover:bg-accent
          flex flex-col items-center justify-between
          min-h-[60px] sm:min-h-[70px] md:min-h-[80px]
          px-2 py-2
          ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
          ${hasAvailability ? 'bg-primary/5' : ''}
          ${today ? 'border-primary border-2' : ''}
        `}
      >
        <div className={`text-sm sm:text-base font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
          {date.getDate()}
        </div>
        <div className="h-2 flex items-center justify-center">
          {hasAvailability && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      </div>
    </Link>
  );
}
