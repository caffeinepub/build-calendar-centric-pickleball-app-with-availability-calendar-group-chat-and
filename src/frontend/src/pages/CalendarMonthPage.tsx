import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useDaysWithAnyAvailability } from '../hooks/useQueries';
import { useAvailabilityNotifications } from '../hooks/useInAppNotifications';
import { getDayId, getMonthGridDays, formatMonthYear, isSameDay, isToday } from '../lib/date';
import ChatPanel from '../components/chat/ChatPanel';

export default function CalendarMonthPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const gridDays = useMemo(() => getMonthGridDays(year, month), [year, month]);
  const dayIds = useMemo(() => gridDays.map(getDayId), [gridDays]);
  
  const { data: availabilityMap, isLoading } = useDaysWithAnyAvailability(dayIds);

  // Enable availability notifications for the calendar view
  // We pass null for day since we're monitoring all days in the month
  useAvailabilityNotifications(null, true);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    const dayId = getDayId(date);
    navigate({ to: '/day/$date', params: { date: dayId.toString() } });
  };

  const handleAddAvailability = () => {
    navigate({ to: '/add-availability' });
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === month;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold min-w-[200px] text-center">
            {formatMonthYear(currentDate)}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleAddAvailability} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {gridDays.map((date, index) => {
                  const dayId = getDayId(date);
                  const hasAvailability = availabilityMap?.get(dayId.toString()) || false;
                  const isCurrentMonthDay = isCurrentMonth(date);
                  const isTodayDate = isToday(date);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(date)}
                      className={`
                        aspect-square p-2 rounded-lg text-sm transition-colors relative
                        ${isCurrentMonthDay ? 'hover:bg-accent' : 'text-muted-foreground hover:bg-muted'}
                        ${isTodayDate ? 'bg-primary/10 font-bold' : ''}
                      `}
                    >
                      <span className={isTodayDate ? 'text-primary' : ''}>
                        {date.getDate()}
                      </span>
                      {hasAvailability && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="h-[clamp(533px,70vh,1067px)]">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
