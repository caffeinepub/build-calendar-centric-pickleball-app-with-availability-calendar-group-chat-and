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
        <CardContent className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[600px]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
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

      <ChatPanel />
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
          min-h-[80px] sm:min-h-[100px] md:min-h-[120px]
          flex flex-col justify-between p-3
          ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
          ${hasAvailability ? 'bg-primary/5' : ''}
          ${today ? 'border-primary border-2' : ''}
        `}
      >
        <div className={`text-base font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
          {date.getDate()}
        </div>
        {hasAvailability && (
          <div className="flex justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
          </div>
        )}
      </div>
    </Link>
  );
}
