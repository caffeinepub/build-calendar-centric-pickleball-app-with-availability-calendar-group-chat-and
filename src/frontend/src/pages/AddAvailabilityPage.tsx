import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useAddAvailability, useGetCallerAvailability } from '../hooks/useQueries';
import { getDayId, formatDate } from '../lib/date';
import {
  parseTimeString,
  formatTimeString,
  getHourOptions,
  getMinuteOptions,
  getPeriodOptions,
  getDefaultTimeComponents,
  type TimeComponents,
} from '../utils/time';
import { toast } from 'sonner';

export default function AddAvailabilityPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { date?: string };
  
  const [selectedDate, setSelectedDate] = useState<Date>(
    search.date ? new Date(Number(BigInt(search.date).toString().slice(0, 4)), Number(BigInt(search.date).toString().slice(4, 6)) - 1, Number(BigInt(search.date).toString().slice(6, 8))) : new Date()
  );
  
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM' | ''>('');
  const [notes, setNotes] = useState('');

  const dayId = getDayId(selectedDate);
  const { data: existingAvailability } = useGetCallerAvailability(dayId);
  const { mutate: addAvailability, isPending } = useAddAvailability();

  useEffect(() => {
    if (existingAvailability) {
      const parsed = parseTimeString(existingAvailability.time);
      if (parsed) {
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setPeriod(parsed.period);
      } else {
        // Fallback to default if parsing fails
        const defaults = getDefaultTimeComponents();
        setHour(defaults.hour);
        setMinute(defaults.minute);
        setPeriod(defaults.period);
      }
      setNotes(existingAvailability.notes || '');
    }
  }, [existingAvailability]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hour || !minute || !period) return;

    const timeString = formatTimeString(hour, minute, period);

    addAvailability(
      { day: dayId, time: timeString, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success(existingAvailability ? 'Availability updated' : 'Availability added');
          navigate({ to: '/day/$date', params: { date: dayId.toString() } });
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to save availability. Please try again.');
        },
      }
    );
  };

  const handleBack = () => {
    navigate({ to: '/' });
  };

  const isFormValid = hour && minute && period;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold">
          {existingAvailability ? 'Edit' : 'Add'} Availability
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="hour" className="text-xs text-muted-foreground">
                    Hour
                  </Label>
                  <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger id="hour">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {getHourOptions().map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="minute" className="text-xs text-muted-foreground">
                    Minute
                  </Label>
                  <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger id="minute">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMinuteOptions().map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="period" className="text-xs text-muted-foreground">
                    AM/PM
                  </Label>
                  <Select value={period} onValueChange={(val) => setPeriod(val as 'AM' | 'PM')}>
                    <SelectTrigger id="period">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPeriodOptions().map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes (e.g., prefer doubles, bringing extra paddles, etc.)"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={!isFormValid || isPending} className="flex-1">
                {isPending ? 'Saving...' : existingAvailability ? 'Update Availability' : 'Add Availability'}
              </Button>
              <Button type="button" variant="outline" onClick={handleBack}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
